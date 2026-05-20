import React, { useState, useEffect } from 'react';

export interface PromptVersion {
    id: string;
    name: string;
    timestamp: number;
    content: string;
    baseVersionId?: string;
}

interface BranchManagerProps {
    currentContent: string;
    onRestore: (content: string) => void;
}

export default function BranchManager({ currentContent, onRestore }: BranchManagerProps) {
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');

    // Lightweight versioning for this session/page
    useEffect(() => {
        const saved = localStorage.getItem('sr_prompt_versions');
        if (saved) {
            try {
                setVersions(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse versions', e);
            }
        }
    }, []);

    const saveVersion = () => {
        if (!currentContent.trim()) return;

        const name = newVersionName.trim() || `v${versions.length + 1}.0`;
        const newVersion: PromptVersion = {
            id: Math.random().toString(36).substring(2, 9),
            name,
            timestamp: Date.now(),
            content: currentContent,
            baseVersionId: versions.length > 0 ? versions[0].id : undefined
        };

        const updated = [newVersion, ...versions];
        setVersions(updated);
        localStorage.setItem('sr_prompt_versions', JSON.stringify(updated));
        setNewVersionName('');
    };

    const deleteVersion = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = versions.filter(v => v.id !== id);
        setVersions(updated);
        localStorage.setItem('sr_prompt_versions', JSON.stringify(updated));
    };

    const clearAll = () => {
        if (confirm('Are you sure you want to clear the entire version history?')) {
            setVersions([]);
            localStorage.removeItem('sr_prompt_versions');
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-border/40 text-gray-400 font-mono text-[10px] hover:text-white hover:bg-cyber-primary/10 transition-colors"
                title="Version History"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Versions ({versions.length})
            </button>
        );
    }

    return (
        <div className="glass-card mt-4 p-4 border border-cyber-primary/30 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-purple-500 to-cyber-primary" />

            <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-xs font-bold text-gray-200 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    Version Control
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder={`Example: v${versions.length + 1}.0 - Post-refactor`}
                    className="flex-1 bg-cyber-dark/50 border border-cyber-border/40 rounded-lg px-3 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-cyber-primary/50"
                    onKeyDown={(e) => e.key === 'Enter' && saveVersion()}
                />
                <button
                    onClick={saveVersion}
                    disabled={!currentContent.trim()}
                    className="px-3 py-1.5 bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/40 rounded-lg text-[10px] font-mono hover:bg-cyber-primary/30 transition-colors disabled:opacity-50"
                >
                    Save Version
                </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {versions.length === 0 ? (
                    <div className="text-center py-4 font-mono text-[9px] text-gray-600">
                        No saved versions yet.
                    </div>
                ) : (
                    versions.map((v) => (
                        <div
                            key={v.id}
                            className="flex items-center justify-between p-2 rounded-lg border border-cyber-border/20 bg-cyber-dark/30 hover:bg-cyber-primary/10 transition-colors cursor-pointer group"
                            onClick={() => {
                                if (confirm(`Return to "${v.name}"? Your current changes may be lost.`)) {
                                    onRestore(v.content);
                                }
                            }}
                        >
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-mono text-[11px] text-gray-200 font-bold truncate">{v.name}</span>
                                <span className="font-mono text-[9px] text-gray-500">
                                    {new Date(v.timestamp).toLocaleString('en-US')} • {v.content.length} characters
                                </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(v.content);
                                    }}
                                    className="p-1.5 rounded text-gray-400 hover:text-cyber-primary hover:bg-cyber-primary/20 transition-colors"
                                    title="Copy"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                <button
                                    onClick={(e) => deleteVersion(v.id, e)}
                                    className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/20 transition-colors"
                                    title="Delete"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {versions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-cyber-border/20 text-right">
                    <button onClick={clearAll} className="font-mono text-[9px] text-red-400 hover:text-red-300 transition-colors">
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
}
