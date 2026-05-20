import React, { useState, useEffect } from 'react';

interface EndpointStatus {
    name: string;
    url: string;
    status: 'ok' | 'error' | 'loading' | 'auth';
    latency?: number;
    requiresAuth?: boolean;
}

const ENDPOINTS: Omit<EndpointStatus, 'status' | 'latency'>[] = [
    { name: 'API Health', url: '/v1/health' },
    { name: 'Prompts', url: '/v1/prompts', requiresAuth: true },
    { name: 'Vector Stats', url: '/v1/prompts/vector-stats', requiresAuth: true },
];

interface BackendHealthPanelProps {
    onOpenAuthSettings?: () => void;
}

export default function BackendHealthPanel({ onOpenAuthSettings }: BackendHealthPanelProps) {
    const apiKey = (import.meta.env.VITE_API_KEY ?? '').trim();
    const hasApiKey = apiKey.length > 0;

    const [statuses, setStatuses] = useState<EndpointStatus[]>(
        ENDPOINTS.map(e => ({ ...e, status: 'loading' }))
    );
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    const checkAll = async () => {
        setStatuses(ENDPOINTS.map(e => ({ ...e, status: 'loading' })));
        const results = await Promise.all(
            ENDPOINTS.map(async (ep) => {
                if (ep.requiresAuth && !hasApiKey) {
                    return { ...ep, status: 'auth' as const };
                }
                const t0 = Date.now();
                try {
                    const res = await fetch(ep.url, {
                        signal: AbortSignal.timeout(4000),
                        headers: ep.requiresAuth ? { 'x-api-key': apiKey } : undefined,
                    });
                    if (!res.ok && (res.status === 401 || res.status === 403)) {
                        return { ...ep, status: 'auth' as const, latency: Date.now() - t0 };
                    }
                    return { ...ep, status: res.ok ? 'ok' as const : 'error' as const, latency: Date.now() - t0 };
                } catch {
                    return { ...ep, status: 'error' as const, latency: Date.now() - t0 };
                }
            })
        );
        setStatuses(results);
        setLastCheck(new Date());
    };

    useEffect(() => { checkAll(); }, []);

    const hasError = statuses.some((s) => s.status === 'error');
    const hasAuthRequired = statuses.some((s) => s.status === 'auth');
    const allOk = statuses.every((s) => s.status === 'ok');

    return (
        <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            hasError
                                ? 'bg-red-400'
                                : allOk
                                    ? 'bg-cyber-success animate-pulse'
                                    : hasAuthRequired
                                        ? 'bg-amber-300'
                                        : 'bg-gray-500'
                        }`}
                    />
                    <h3 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Service Status
                    </h3>
                </div>
                <button
                    onClick={checkAll}
                    aria-label="Refresh service status"
                    className="h-11 px-3 font-mono text-[9px] text-gray-600 hover:text-cyber-primary transition-colors uppercase tracking-wider inline-flex items-center gap-1"
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                    Refresh
                </button>
            </div>

            <div className="space-y-2">
                {statuses.map((ep) => (
                    <div key={ep.name} className="flex items-center justify-between py-1.5 border-b border-cyber-border/20 last:border-0">
                        <span className="font-mono text-[10px] text-gray-400">{ep.name}</span>
                        <div className="flex items-center gap-2">
                            {ep.latency !== undefined && (
                                <span className="font-mono text-[9px] text-gray-600">{ep.latency}ms</span>
                            )}
                            <span className={`font-mono text-[9px] font-bold uppercase ${ep.status === 'ok' ? 'text-cyber-success' :
                                    ep.status === 'error' ? 'text-red-400' : ep.status === 'auth' ? 'text-amber-300' : 'text-gray-600'
                                }`}>
                                {ep.status === 'loading'
                                    ? '...'
                                    : ep.status === 'auth'
                                        ? 'auth required'
                                        : ep.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {hasAuthRequired && (
                <div className="rounded-[14px] border border-amber-300/20 bg-amber-400/10 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-amber-200">Auth required</p>
                    <p className="mt-2 text-[12px] leading-5 text-slate-200">
                        Prompts and Vector Stats require an API key.
                    </p>
                    {onOpenAuthSettings && (
                        <button
                            type="button"
                            onClick={onOpenAuthSettings}
                            className="mt-3 inline-flex items-center rounded-[10px] border border-amber-300/30 bg-amber-400/12 px-3 py-1.5 font-mono text-[11px] text-amber-100 transition-colors hover:bg-amber-400/18"
                        >
                            Go to settings
                        </button>
                    )}
                </div>
            )}

            {lastCheck && (
                <p className="font-mono text-[9px] text-gray-700">
                    Last check: {lastCheck.toLocaleTimeString('en-US')}
                </p>
            )}
        </div>
    );
}
