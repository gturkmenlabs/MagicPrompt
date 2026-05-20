import React, { useState } from 'react';
import { PromptMonaco } from './editor/PromptMonaco';

interface SystemPromptEditorProps {
  value: string;
  onChange: (v: string) => void;
  onVerify?: () => void | Promise<void>;
  verifying?: boolean;
}

const PRESETS = [
    { label: 'Expert AI', value: 'You are an expert AI engineer and prompt designer. Always produce structured, clear, and effective outputs.' },
    { label: 'English-first', value: 'Always reply in English. Keep terminology consistent and professional.' },
    { label: 'Concise & Clear', value: 'Keep responses as short and clear as possible. Avoid unnecessary explanation and go straight to the result.' },
    { label: 'Structured reasoning', value: 'Before the final answer, show the reasoning process step by step inside a <thinking> block, then provide the result.' },
];

export default function SystemPromptEditor({ value, onChange, onVerify, verifying = false }: SystemPromptEditorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card p-5 space-y-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[44px] flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${value ? 'bg-cyber-primary animate-pulse' : 'bg-gray-600'}`} />
          <h3 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
            {'System Prompt'}
          </h3>
          {value && <span className="font-mono text-[8px] text-cyber-primary/70 bg-cyber-primary/10 px-1.5 py-0.5 rounded">Active</span>}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.value)}
                className="min-h-[44px] px-3 py-1 rounded border border-cyber-border/40 font-mono text-[9px] text-gray-500 hover:border-cyber-primary/40 hover:text-cyber-primary transition-colors"
              >
                {p.label}
              </button>
            ))}
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="min-h-[44px] px-3 py-1 rounded border border-red-500/30 font-mono text-[9px] text-red-400/70 hover:text-red-400 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          <PromptMonaco
            value={value}
            onChange={onChange}
            placeholder="Write your system prompt here..."
            minHeight={140}
            language="markdown"
          />
          {onVerify && (
            <button
              type="button"
              onClick={onVerify}
              disabled={verifying}
              className="min-h-[40px] px-3 py-1 rounded border border-cyan-400/40 font-mono text-[10px] text-cyan-300/80 hover:text-cyan-200 hover:border-cyan-300/60 transition-colors disabled:opacity-60"
            >
              {verifying ? 'Verifying...' : 'Verify system prompt effect'}
            </button>
          )}
          <p className="font-mono text-[9px] text-gray-700">
            * This system prompt is sent to the AI on every generate call
          </p>
        </div>
      )}
    </div>
  );
}
