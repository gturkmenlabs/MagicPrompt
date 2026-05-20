import React, { useMemo } from 'react';

const INJECTION_PATTERNS = [
    { pattern: /ignore (all |previous |prior )?(instructions?|rules?|prompts?)/i, severity: 'high', msg: 'Potential prompt-injection pattern detected' },
    { pattern: /you are now|from now on you|pretend (you are|to be)/i, severity: 'high', msg: 'Role-switch attempt detected' },
    { pattern: /jailbreak|DAN|do anything now/i, severity: 'high', msg: 'Jailbreak pattern detected' },
    { pattern: /\[SYSTEM\]|\<system\>|<<SYS>>/i, severity: 'medium', msg: 'Fake system-prompt pattern detected' },
    { pattern: /reveal (your|the) (system )?prompt|what (is|are) your instructions?/i, severity: 'medium', msg: 'Prompt-extraction attempt detected' },
    { pattern: /translate (this|the following) to|repeat (the above|after me)/i, severity: 'low', msg: 'Suspicious repetition pattern detected' },
];

type Severity = 'high' | 'medium' | 'low';

interface Finding { severity: Severity; msg: string }

interface PromptInjectionWarningProps {
    text: string;
    onConfirm?: () => void;
}

const SEV_STYLES: Record<Severity, { border: string; bg: string; text: string; icon: string }> = {
    high: { border: 'border-red-500/60', bg: 'bg-red-500/8', text: 'text-red-400', icon: '🚨' },
    medium: { border: 'border-yellow-500/60', bg: 'bg-yellow-500/8', text: 'text-yellow-400', icon: '⚠️' },
    low: { border: 'border-orange-500/40', bg: 'bg-orange-500/5', text: 'text-orange-400', icon: '💡' },
};

export default function PromptInjectionWarning({ text, onConfirm }: PromptInjectionWarningProps) {
    const findings = useMemo<Finding[]>(() => {
        if (!text?.trim()) return [];
        return INJECTION_PATTERNS
            .filter(p => p.pattern.test(text))
            .map(p => ({ severity: p.severity as Severity, msg: p.msg }));
    }, [text]);

    if (findings.length === 0) return null;

    const worst = findings.find(f => f.severity === 'high') || findings.find(f => f.severity === 'medium') || findings[0];
    const style = SEV_STYLES[worst.severity];

    return (
        <div className={`p-3 rounded-lg border ${style.border} ${style.bg} space-y-2`}>
            <div className="flex items-center gap-2">
                <span>{style.icon}</span>
                <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                    Security Warning ({findings.length} detections)
                </span>
            </div>
            <ul className="space-y-0.5">
                {findings.map((f, i) => (
                    <li key={i} className={`font-mono text-[9px] ${SEV_STYLES[f.severity].text} flex items-center gap-1`}>
                        <span className="text-[8px]">{SEV_STYLES[f.severity].icon}</span> {f.msg}
                    </li>
                ))}
            </ul>
            {onConfirm && (
                <button type="button" onClick={onConfirm}
                    className="font-mono text-[9px] text-gray-500 hover:text-gray-300 transition-colors underline">
                    I understand the risk, send anyway {'>'}
                </button>
            )}
        </div>
    );
}
