import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui';
import { useTranslation } from '../i18n';

interface OutputTerminalProps {
  result?: { masterPrompt: string; reasoning?: string };
  loading?: boolean;
  agentAnalyzing?: boolean;
  agentHint?: string | null;
  onInsertExample?: () => void;
  onSuggestTemplate?: () => void;
  onCopyResult?: () => void;
  onDiffResult?: () => void;
  onShareResult?: () => void;
  onApplyResult?: () => void;
}

export default function OutputTerminal({
  result,
  loading,
  agentAnalyzing,
  agentHint,
  onInsertExample,
  onSuggestTemplate,
  onCopyResult,
  onDiffResult,
  onShareResult,
  onApplyResult,
}: OutputTerminalProps) {
  
  const hasResult = Boolean(result?.masterPrompt);

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-white/10 bg-slate-950/54">


      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
        {(loading || agentAnalyzing) && (
          <div className="flex flex-1 flex-col items-center justify-center space-y-6 py-8 text-center w-full">
            <div className="relative w-full max-w-[320px] overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/5 to-emerald-400/5 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
              <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                  <svg className="h-6 w-6 text-cyan-400 animate-[spin_3s_linear_infinite]" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold tracking-wide text-cyan-100">
                    {agentAnalyzing ? 'Resolving context & intent...' : 'Building prompt architecture...'}
                  </h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-cyan-100/70">
                    {agentHint || 'The system is mapping the context and constraints, engineering the optimal prompt structure.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-[320px] space-y-3">
              {[
                { title: 'Intent Analysis', desc: 'Resolving user request and context' },
                { title: 'Configuration', desc: 'Applying domain & framework constraints' },
                { title: 'Architecture', desc: 'Building reasoning scaffold & prompt structure' },
                { title: 'Generation', desc: 'Formatting final output payload' }
              ].map((step, index) => {
                const isComplete = index < (agentAnalyzing ? 1 : 2);
                const isActive = index === (agentAnalyzing ? 1 : 2);
                
                return (
                  <div key={step.title} className={`group relative flex items-center text-left gap-4 rounded-xl border p-4 transition-all duration-300 ${isActive ? 'border-cyan-400/20 bg-cyan-400/5 shadow-[0_0_20px_rgba(34,211,238,0.03)]' : isComplete ? 'border-white/5 bg-white/[0.02]' : 'border-white/[0.02] bg-transparent opacity-50'}`}>
                    <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                      {isComplete ? (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-400/20 text-emerald-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : isActive ? (
                        <>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/40" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        </>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className={`text-[13px] font-medium ${isActive ? 'text-cyan-100' : isComplete ? 'text-slate-200' : 'text-slate-400'}`}>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !agentAnalyzing && !hasResult && (
          <div className="flex flex-1 flex-col items-center justify-center space-y-6 py-8 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-white/5 ring-1 ring-white/10 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
              <svg className="h-10 w-10 text-cyan-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            
            <div className="space-y-2 max-w-[280px]">
              <h4 className="text-[17px] font-semibold tracking-wide text-white">
                {'Live output will appear here'}
              </h4>
              <p className="text-[13px] leading-relaxed text-slate-400">
                {'When Generate runs, the output and reasoning summary will appear in a structured format.'}
              </p>
            </div>

            <div className="w-full max-w-[320px] space-y-3">
              <button
                type="button"
                onClick={onInsertExample}
                className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[13px] font-medium text-slate-300 transition-all hover:bg-cyan-400/10 hover:border-cyan-400/20 hover:text-cyan-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 group-hover:bg-cyan-400/20 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  {'Fill example prompt'}
                </div>
                <svg className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                type="button"
                onClick={onSuggestTemplate}
                className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[13px] font-medium text-slate-300 transition-all hover:bg-emerald-400/10 hover:border-emerald-400/20 hover:text-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 group-hover:bg-emerald-400/20 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  {'Suggest from library'}
                </div>
                <svg className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!loading && !agentAnalyzing && hasResult && result && (
          <div className="space-y-5">




            <section className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-5 shadow-[0_0_30px_rgba(34,211,238,0.03)] backdrop-blur-sm">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-80" />
              <div className="prose prose-invert prose-sm max-w-none text-slate-100 prose-headings:text-white prose-headings:font-semibold prose-p:text-slate-200 prose-p:leading-relaxed prose-li:text-slate-200 prose-strong:text-cyan-100 prose-code:text-emerald-300 prose-code:bg-emerald-400/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:hidden prose-code:after:hidden prose-pre:border prose-pre:border-white/10 prose-pre:bg-slate-950/80 prose-pre:shadow-inner">
                <ReactMarkdown>{result.masterPrompt}</ReactMarkdown>
              </div>
            </section>

            {result.reasoning && (
              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-sm">
                <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-[14px] font-semibold tracking-wide text-slate-200">Reasoning Engine</h5>
                      <p className="mt-0.5 text-[12px] text-slate-500">How this prompt was architected</p>
                    </div>
                  </div>
                  <Badge tone="neutral">Internal</Badge>
                </div>
                <div className="prose prose-invert prose-sm max-w-none opacity-90 text-slate-300 prose-headings:text-slate-200 prose-headings:font-medium prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-slate-200 prose-code:text-cyan-200/80 prose-pre:border prose-pre:border-white/5 prose-pre:bg-slate-950 p-2 rounded-xl bg-white/[0.01]">
                  <ReactMarkdown>{result.reasoning}</ReactMarkdown>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
