import React, { useEffect } from 'react';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { keys: ['Ctrl', 'Enter'], desc: 'Generate prompt' },
    { keys: ['?'], desc: 'Open or close the shortcuts menu' },
    { keys: ['Esc'], desc: 'Close modal' },
    { keys: ['1'], desc: 'Go to Prompt Lab' },
    { keys: ['2'], desc: 'Go to Library' },
    { keys: ['3'], desc: 'Go to AI Lab' },
    { keys: ['4'], desc: 'Go to Optimizer' },
    { keys: ['5'], desc: 'Go to RAG Engine' },
    { keys: ['6'], desc: 'Go to Analytics' },
    { keys: ['7'], desc: 'Go to Settings' },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="glass-card w-full max-w-sm mx-4 p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="font-mono text-xs font-bold text-white uppercase tracking-widest">
                        ⌨ Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Shortcuts list */}
                <div className="space-y-2">
                    {SHORTCUTS.map(({ keys, desc }) => (
                        <div key={desc} className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-gray-400">{desc}</span>
                            <div className="flex items-center gap-1">
                                {keys.map((k, i) => (
                                    <React.Fragment key={k}>
                                        {i > 0 && <span className="text-gray-600 text-[9px]">+</span>}
                                        <kbd className="px-1.5 py-0.5 rounded border border-cyber-border/60 bg-cyber-dark font-mono text-[9px] text-cyber-primary">
                                            {k}
                                        </kbd>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="font-mono text-[9px] text-gray-600 text-center">
                    Click anywhere to close
                </p>
            </div>
        </div>
    );
}
