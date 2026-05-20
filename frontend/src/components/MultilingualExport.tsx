import React, { useState } from 'react';
import { generateMasterPromptUnified } from '@/services/unifiedProviderClient';

interface MultilingualExportProps {
  content: string;
  provider: string;
  model: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

export default function MultilingualExport({ content, provider, model }: MultilingualExportProps) {
  const [targetLang, setTargetLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleTranslate = async () => {
    if (!content) return;
    setLoading(true);
    try {
      const languageName = LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang;
      const prompt = `Translate the text below to ${languageName}. Return only the translated text with no extra explanation.\n\nText:\n${content}`;

      const result = await generateMasterPromptUnified(provider as any, {
        intent: prompt,
        framework: 'none' as any,
        domainId: 'translation',
        useSearch: false,
        thinkingMode: false,
        localizedRules: '',
        openRouterModel: model,
      });

      setTranslated(result.response.masterPrompt);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslated('Translation failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (translated) navigator.clipboard.writeText(translated);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-border/40 text-gray-400 font-mono text-[10px] hover:text-white hover:bg-cyber-primary/10 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        Translate
      </button>
    );
  }

  return (
    <div className="glass-card mt-4 p-4 border border-cyber-primary/30 rounded-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyber-primary to-purple-500" />

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs font-bold text-gray-200 flex items-center gap-2">
          🌐 Multilingual Output
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="flex-1 bg-cyber-dark/50 border border-cyber-border/40 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyber-primary/50"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleTranslate}
          disabled={loading || !content}
          className="px-4 py-2 bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/40 rounded-lg text-sm hover:bg-cyber-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? 'Translating...' : 'Translate ⚡'}
        </button>
      </div>

      {translated && (
        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-gray-500 uppercase">Translation Result</span>
            <button onClick={copyToClipboard} className="text-gray-400 hover:text-cyber-primary transition-colors flex items-center gap-1 font-mono text-[10px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </button>
          </div>
          <div className="bg-cyber-dark/80 border border-cyber-border/30 rounded-lg p-3 max-h-48 overflow-y-auto text-sm text-gray-300 font-sans leading-relaxed">
            {translated}
          </div>
        </div>
      )}
    </div>
  );
}
