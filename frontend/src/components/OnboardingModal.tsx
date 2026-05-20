import React, { useEffect, useState } from 'react';
import { LayoutPanelLeft, PenLine, Zap } from 'lucide-react';

interface OnboardingModalProps {
    onDone: () => void;
}

const STEPS = [
    {
        icon: <Zap size={28} strokeWidth={1.5} />,
        title: '1. Define the goal',
        desc: 'Enter a one-line goal in the center of Prompt Lab: what should be produced, for whom, and in what tone?',
        tip: 'A strong start: role + goal + constraints + output format.',
    },
    {
        icon: <LayoutPanelLeft size={28} strokeWidth={1.5} />,
        title: '2. Pick a domain',
        desc: 'Choose the domain from the left panel and add a framework if needed. If you are unsure, start with Auto Route and the core domain cards.',
        tip: 'Narrow the space with a filter or search first, then choose a card.',
    },
    {
        icon: <PenLine size={28} strokeWidth={1.5} />,
        title: '3. Generate',
        desc: 'Run Generate to produce the output. Live result, history, and versions appear together in the right rail.',
        tip: 'Use Fill example prompt and Suggest template to get moving quickly from an empty state.',
    },
];

export default function OnboardingModal({ onDone }: OnboardingModalProps) {
    const [step, setStep] = useState(0);
    const [leaving, setLeaving] = useState(false);

    const next = () => {
        if (step < STEPS.length - 1) setStep(s => s + 1);
        else finish();
    };
    const finish = () => {
        setLeaving(true);
        localStorage.setItem('sr_onboarding_done', '1');
        setTimeout(onDone, 400);
    };

    const current = STEPS[step];

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-200 ${leaving ? 'opacity-0' : 'opacity-100'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
        >
            <div className="glass-card w-full max-w-md mx-4 p-8 space-y-6 animate-in zoom-in-95 duration-200">
                <div className="text-center space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyber-primary/80">Start in 30 seconds</p>
                    <h1 id="onboarding-title" className="font-mono text-sm font-bold uppercase tracking-wider text-white">Quick onboarding for prompt work</h1>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-cyber-primary' : 'w-2 h-2 bg-cyber-border/60'}`} />
                    ))}
                </div>

                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-cyber-dark border border-cyber-border/40 flex items-center justify-center text-cyber-primary">
                        {current.icon}
                    </div>
                </div>

                {/* Content */}
                <div className="text-center space-y-2">
                    <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider">{current.title}</h2>
                    <p className="font-mono text-[11px] text-gray-400 leading-relaxed">{current.desc}</p>
                </div>

                {/* Tip */}
                <div className="px-4 py-3 rounded-lg bg-cyber-primary/5 border border-cyber-primary/20">
                    <p className="font-mono text-[10px] leading-relaxed text-cyber-primary/80">{current.tip}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button type="button" onClick={finish} className="font-mono text-[10px] text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wider">
                        Skip
                    </button>
                    <button type="button" onClick={next}
                        className="px-6 py-2 rounded-lg bg-cyber-primary/20 border border-cyber-primary/40 text-cyber-primary font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-cyber-primary/30 transition-all flex items-center gap-1.5">
                        {step < STEPS.length - 1 ? 'Next' : 'Start'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function useOnboarding() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (!localStorage.getItem('sr_onboarding_done')) {
            const t = setTimeout(() => setShow(true), 800);
            return () => clearTimeout(t);
        }
    }, []);
    return { show, done: () => setShow(false) };
}
