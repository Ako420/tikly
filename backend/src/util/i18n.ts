import en from '../locales/en.json';
import fr from '../locales/fr.json';
import type { Language } from '../types/enums';

type Dictionary = { [key: string]: string | Dictionary };

const dictionaries: Record<Language, Dictionary> = { en, fr };

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: string | Dictionary | undefined = dictionary;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function hasTranslation(key: string, lang: Language) {
  return lookup(dictionaries[lang], key) !== undefined;
}

export function t(key: string, lang: Language = 'en', params: Record<string, unknown> = {}) {
  const template = lookup(dictionaries[lang], key) ?? lookup(dictionaries.en, key) ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
