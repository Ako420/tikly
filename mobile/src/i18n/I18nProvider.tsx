import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import en from './locales/en.json';
import fr from './locales/fr.json';

export type Language = 'en' | 'fr';

const dictionaries: Record<Language, Record<string, unknown>> = { en, fr };

const lookup = (dictionary: Record<string, unknown>, key: string): string | undefined => {
  const value = key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dictionary,
  );
  return typeof value === 'string' ? value : undefined;
};

type TranslateParams = Record<string, string | number>;

const interpolate = (template: string, params?: TranslateParams) =>
  params ? template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : template;

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initialLanguage = 'en' }: { children: ReactNode; initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  const t = useCallback(
    (key: string, params?: TranslateParams) =>
      interpolate(lookup(dictionaries[language], key) ?? lookup(dictionaries.en, key) ?? key, params),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used inside I18nProvider');
  return context;
}
