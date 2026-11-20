/**
 * @file index.ts
 * @description Bilingual dictionary accessor for English and Hindi (हिंदी).
 */

import en from './en.json';
import hi from './hi.json';

export type SupportedLanguage = 'en' | 'hi';
export type I18nDictionary = typeof en;

const dictionaries: Record<SupportedLanguage, I18nDictionary> = {
  en,
  hi,
};

export function getDictionary(lang: SupportedLanguage = 'en'): I18nDictionary {
  return dictionaries[lang] ?? dictionaries.en;
}
