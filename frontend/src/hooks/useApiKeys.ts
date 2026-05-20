import { useState, useEffect } from 'react';

export interface ApiKeys {
    gemini: string;
    openai: string;
    anthropic: string;
    groq: string;
    deepseek: string;
    huggingface: string;
    openrouter: string;
    fal: string;
    mistral: string;
}

const STORAGE_KEY = 'sr_api_keys';
const defaultKeys: ApiKeys = { gemini: '', openai: '', anthropic: '', groq: '', deepseek: '', huggingface: '', openrouter: '', fal: '', mistral: '' };

function syncToWindow(k: ApiKeys) {
    if (typeof window === 'undefined') return;
    const w = window as any;
    if (k.gemini) w.__SR_GEMINI_KEY = k.gemini;
    if (k.openai) w.__SR_OPENAI_KEY = k.openai;
    if (k.anthropic) w.__SR_CLAUDE_KEY = k.anthropic;
    if (k.groq) w.__SR_GROQ_KEY = k.groq;
    if (k.deepseek) w.__SR_DEEPSEEK_KEY = k.deepseek;
    if (k.huggingface) w.__SR_HF_KEY = k.huggingface;
    if (k.openrouter) w.__SR_OR_KEY = k.openrouter;
    if (k.fal) w.__SR_FAL_KEY = k.fal;
    if (k.mistral) w.__SR_MISTRAL_KEY = k.mistral;
}

function loadKeys(): ApiKeys {
    try {
        const loaded = { ...defaultKeys, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
        // Immediately sync to window so other modules can pick them up on first render
        syncToWindow(loaded);
        return loaded;
    } catch {
        return defaultKeys;
    }
}

export function useApiKeys() {
    const [keys, setKeys] = useState<ApiKeys>(loadKeys);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
        // Sync to env-like globals for services to pick up
        syncToWindow(keys);
    }, [keys]);

    const setKey = (provider: keyof ApiKeys, value: string) => {
        setKeys(prev => ({ ...prev, [provider]: value }));
    };

    return { keys, setKey };
}
