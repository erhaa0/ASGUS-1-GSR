import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../App';
import ShortcutSheet from './ShortcutSheet';

/**
 * KeyboardShortcutHandler
 *
 * Mounts inside <Router> (so useNavigate works).
 * Owns:
 *  - The ShortcutSheet open/close state
 *  - All global keydown listeners for:
 *      ?          → toggle sheet
 *      Esc        → close sheet
 *      [          → dispatch custom event for sidebar toggle
 *      G → D/A/Z/S → navigate (with role guard)
 *      1-4        → dispatch custom event for map layer (Analyst Dashboard only)
 *
 * NO page files are touched. Pages that want to react to [ or 1-4 simply add
 * a window listener for 'asgus:sidebar-toggle' or 'asgus:layer-change'.
 * (Those listeners are NOT added in this PR — this file is standalone.)
 */
const KeyboardShortcutHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const role = user?.role || 'analyst';

    const [sheetOpen, setSheetOpen] = useState(false);
    const gPressedRef = useRef(false);   // true for 1 s after G is pressed
    const gTimerRef = useRef(null);

    const handleKeyDown = useCallback(
        (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            const inInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

            // ── ? ── toggle sheet (skip when typing)
            if (e.key === '?' && !inInput) {
                e.preventDefault();
                setSheetOpen((prev) => !prev);
                return;
            }

            // ── Esc ── close sheet
            if (e.key === 'Escape') {
                if (sheetOpen) {
                    setSheetOpen(false);
                }
                return;
            }

            // Skip all remaining shortcuts when typing in a form field
            if (inInput) return;

            // ── [ ── sidebar toggle (custom event — pages can opt-in)
            if (e.key === '[') {
                window.dispatchEvent(new CustomEvent('asgus:sidebar-toggle'));
                return;
            }

            // ── 1-4 ── map layer switch (Analyst dashboard custom event)
            if (['1', '2', '3', '4'].includes(e.key) && location.pathname === '/analyst') {
                const layers = ['Terrain', 'Heatmap', 'Satellite', 'Vegetation'];
                const layer = layers[parseInt(e.key, 10) - 1];
                window.dispatchEvent(new CustomEvent('asgus:layer-change', { detail: { layer } }));
                return;
            }

            // ── G → D/A/Z/S ── navigation (two-key sequence)
            if (e.key === 'g' || e.key === 'G') {
                gPressedRef.current = true;
                clearTimeout(gTimerRef.current);
                gTimerRef.current = setTimeout(() => {
                    gPressedRef.current = false;
                }, 1000);
                return;
            }

            if (gPressedRef.current) {
                gPressedRef.current = false;
                clearTimeout(gTimerRef.current);

                const routeMap = {
                    d: role === 'admin' ? '/admin' : role === 'field-officer' ? '/field-officer' : '/analyst',
                    a: '/alerts',
                    z: '/zones',
                    s: '/settings',
                };

                const labelMap = {
                    d: 'Dashboard',
                    a: 'Alert Feed',
                    z: 'Zone Explorer',
                    s: 'Settings',
                };

                const key   = e.key.toLowerCase();
                const target = routeMap[key];

                if (target) {
                    // Role guard: only navigate if the user has access
                    const analystOnly = ['/alerts', '/zones'];
                    if (analystOnly.includes(target) && role !== 'analyst') {
                        window.dispatchEvent(new CustomEvent('asgus:toast', {
                            detail: { message: 'Access restricted for your role', type: 'warning', duration: 3000 }
                        }));
                        return;
                    }
                    window.dispatchEvent(new CustomEvent('asgus:toast', {
                        detail: {
                            message: `Navigating to ${labelMap[key]}`,
                            sub: `G → ${key.toUpperCase()} shortcut`,
                            type: 'info',
                            duration: 2500,
                        }
                    }));
                    navigate(target);
                }
            }
        },
        [sheetOpen, location.pathname, navigate, role]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(gTimerRef.current);
        };
    }, [handleKeyDown]);

    return (
        <ShortcutSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
        />
    );
};

export default KeyboardShortcutHandler;
