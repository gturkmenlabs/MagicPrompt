/**
 * i18n context: language selection and translation helper.
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { translations } from './locales';

export const LANGUAGE_STORAGE_KEY = 'super_reasoning_lang';

type Lang = 'tr' | 'en';

function getStoredLanguage(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'tr') return 'en';
  return 'en';
}

export function detectLanguage(): Lang {
  return getStoredLanguage();
}

type TranslationTable = typeof translations['tr'];
type TFunction = ((key: string) => string) & Omit<TranslationTable, 'ui'> & { ui: TranslationTable['ui'] & Record<string, string> };

type I18nContextValue = {
  language: Lang;
  setLanguage: (_lang: Lang) => void;
  toggleLanguage: () => void;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language] = useState<Lang>('en');

  const setLanguage = useCallback((_lang: Lang) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  }, []);

  const toggleLanguage = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  }, []);

  const tFn = useCallback(
    (key: string): string => {
      const dict = translations[language] as Record<string, unknown>;
      const value = lookup(dict, key);
      return value ?? key;
    },
    [language]
  );

  const t = useMemo<TFunction>(() => {
    const fn = tFn as TFunction;
    Object.assign(fn, translations[language]);
    return fn;
  }, [language, tFn]);

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const lang = getStoredLanguage();
    const dict = translations[lang] as Record<string, unknown>;
    const tFn = (key: string) => (lookup(dict, key) as string) ?? key;
    Object.assign(tFn, translations[lang]);
    return {
      language: lang,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: tFn as TFunction,
    };
  }
  return ctx;
}
