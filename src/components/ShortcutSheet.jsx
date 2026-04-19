import React, { useEffect, useCallback } from 'react';
import { Keyboard, X } from 'lucide-react';
import './ShortcutSheet.css';

/* ─── Shortcut Data ─────────────────────────────────────────────────────────── */
const SHORTCUT_SECTIONS = [
    {
        title: 'Global',
        shortcuts: [
            {
                desc: 'Show this keyboard shortcut guide',
                keys: [{ label: '?', amber: true }],
            },
            {
                desc: 'Close any open modal or drawer',
                keys: [{ label: 'Esc' }],
            },
            {
                desc: 'Collapse / expand sidebar',
                keys: [{ label: '[' }],
            },
        ],
    },
    {
        title: 'Quick Navigation',
        note: 'Press G, then the second key within 1 second',
        shortcuts: [
            {
                desc: 'Go to Dashboard',
                keys: [{ label: 'G' }, { sep: 'then' }, { label: 'D' }],
            },
            {
                desc: 'Go to Alert Feed',
                keys: [{ label: 'G' }, { sep: 'then' }, { label: 'A' }],
            },
            {
                desc: 'Go to Zone Explorer',
                keys: [{ label: 'G' }, { sep: 'then' }, { label: 'Z' }],
            },
            {
                desc: 'Go to Settings',
                keys: [{ label: 'G' }, { sep: 'then' }, { label: 'S' }],
            },
        ],
    },
    {
        title: 'Analyst Dashboard — Map Layers',
        note: 'Works only on the Analyst Dashboard',
        shortcuts: [
            {
                desc: 'Switch to Terrain layer',
                keys: [{ label: '1' }],
            },
            {
                desc: 'Switch to Heatmap layer',
                keys: [{ label: '2' }],
            },
            {
                desc: 'Switch to Satellite layer',
                keys: [{ label: '3' }],
            },
            {
                desc: 'Switch to Vegetation layer',
                keys: [{ label: '4' }],
            },
        ],
    },
];

/* ─── Key Renderer ───────────────────────────────────────────────────────────── */
const KeyCombo = ({ keys }) => (
    <div className="shortcut-keys">
        {keys.map((k, i) => {
            if (k.sep) return <span key={i} className="skey-sep">{k.sep}</span>;
            return (
                <span key={i} className={`skey${k.amber ? ' skey-amber' : ''}`}>
                    {k.label}
                </span>
            );
        })}
    </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const ShortcutSheet = ({ open, onClose }) => {
    // Close on Escape
    const handleKey = useCallback(
        (e) => {
            if (e.key === 'Escape' && open) {
                e.stopPropagation();
                onClose();
            }
        },
        [open, onClose]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [handleKey]);

    // Lock body scroll while open
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="shortcut-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard Shortcuts"
        >
            <div
                className="shortcut-panel"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shortcut-header">
                    <div className="shortcut-header-left">
                        <div className="shortcut-header-icon">
                            <Keyboard size={18} />
                        </div>
                        <div>
                            <div className="shortcut-title">Keyboard Shortcuts</div>
                            <div className="shortcut-subtitle">ASGUS-1 GSR · NOCTARA</div>
                        </div>
                    </div>
                    <button className="shortcut-close-btn" onClick={onClose} aria-label="Close">
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="shortcut-body">
                    {SHORTCUT_SECTIONS.map((section) => (
                        <div key={section.title}>
                            <div className="shortcut-section-title">{section.title}</div>
                            {section.note && (
                                <div style={{
                                    fontSize: 11,
                                    color: '#444',
                                    fontFamily: 'Space Mono, monospace',
                                    marginBottom: 10,
                                    marginTop: -6,
                                }}>
                                    {section.note}
                                </div>
                            )}
                            <div className="shortcut-list">
                                {section.shortcuts.map((s, i) => (
                                    <div key={i} className="shortcut-row">
                                        <span className="shortcut-desc">{s.desc}</span>
                                        <KeyCombo keys={s.keys} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="shortcut-footer">
                    <div className="shortcut-footer-hint">
                        <span className="skey">?</span>
                        <span>to toggle this sheet</span>
                    </div>
                    <div className="shortcut-footer-hint">
                        <span className="skey">Esc</span>
                        <span>to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShortcutSheet;
