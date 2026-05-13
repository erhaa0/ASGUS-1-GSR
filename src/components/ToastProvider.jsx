import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './ToastProvider.css';

/* ─── Config ─────────────────────────────────────────────────────────────────── */
const TYPE_CONFIG = {
    success:  { Icon: CheckCircle,   color: '#22C55E' },
    error:    { Icon: AlertCircle,   color: '#EF4444' },
    info:     { Icon: Info,          color: '#3B82F6' },
    warning:  { Icon: AlertTriangle, color: '#F59E0B' },
};

let _toastId = 0;

/* ─── Single Toast ───────────────────────────────────────────────────────────── */
const Toast = ({ toast, onRemove }) => {
    const [progress, setProgress] = useState(100);
    const [exiting, setExiting] = useState(false);
    const startRef = useRef(Date.now());
    const rafRef   = useRef(null);

    const duration = toast.duration ?? 4000;
    const config   = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info;
    const { Icon, color } = config;

    /* Dismiss — slide out, then unmount */
    const dismiss = useCallback(() => {
        if (exiting) return;
        setExiting(true);
        setTimeout(() => onRemove(toast.id), 250);
    }, [exiting, toast.id, onRemove]);

    /* Animate progress bar with rAF for smooth countdown */
    useEffect(() => {
        const tick = () => {
            const elapsed   = Date.now() - startRef.current;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining > 0) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                dismiss();
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [duration, dismiss]);

    return (
        <div
            className={`asgus-toast${exiting ? ' exiting' : ''}`}
            style={{ '--toast-color': color }}
            role="status"
            aria-live="polite"
        >
            {/* Icon */}
            <div className="asgus-toast-icon">
                <Icon size={15} color={color} />
            </div>

            {/* Text */}
            <div className="asgus-toast-content">
                <div className="asgus-toast-title">{toast.message}</div>
                {toast.sub && (
                    <div className="asgus-toast-sub">{toast.sub}</div>
                )}
            </div>

            {/* Close */}
            <button
                className="asgus-toast-close"
                onClick={dismiss}
                aria-label="Dismiss notification"
            >
                <X size={12} />
            </button>

            {/* Progress bar */}
            <div className="asgus-toast-progress">
                <div
                    className="asgus-toast-progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

/* ─── Provider ───────────────────────────────────────────────────────────────── */
/**
 * ToastProvider
 *
 * Renders at app root. Listens for the custom window event:
 *   window.dispatchEvent(new CustomEvent('asgus:toast', {
 *     detail: {
 *       message:  string,          // required
 *       type:     'success' | 'error' | 'info' | 'warning',  // default: 'info'
 *       duration: number,          // ms, default: 4000
 *       sub:      string,          // optional subtitle
 *     }
 *   }));
 *
 * Stacks up to 3 toasts. Oldest auto-dismissed when a 4th arrives.
 * Zero coupling to any existing page file.
 */
const ToastProvider = () => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const { message, type = 'info', duration = 4000, sub } = e.detail || {};
            if (!message) return;

            const id = ++_toastId;
            setToasts(prev => {
                // Keep max 3 at a time — drop oldest if needed
                const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
                return [...trimmed, { id, message, type, duration, sub }];
            });
        };

        window.addEventListener('asgus:toast', handler);
        return () => window.removeEventListener('asgus:toast', handler);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="asgus-toast-container" aria-label="Notifications">
            {toasts.map(t => (
                <Toast key={t.id} toast={t} onRemove={removeToast} />
            ))}
        </div>
    );
};

export default ToastProvider;
