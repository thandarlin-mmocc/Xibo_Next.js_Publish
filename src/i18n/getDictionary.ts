import en, { type TranslationKey } from "./dictionaries/en";
import ja from "./dictionaries/ja";
import my from "./dictionaries/my";
import vi from "./dictionaries/vi";
import type { Locale } from "./locales";

const PARTIALS: Record<Exclude<Locale, "en">, Partial<Record<TranslationKey, string>>> = {
  ja,
  my,
  vi,
};

/** Full dictionary for a locale - every key present, falling back to English for anything untranslated. */
export function getDictionary(locale: Locale): Record<TranslationKey, string> {
  if (locale === "en") return en;
  return { ...en, ...PARTIALS[locale] };
}

export type { TranslationKey };
