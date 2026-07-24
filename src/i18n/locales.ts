export const SUPPORTED_LOCALES = ["en", "ja", "my", "vi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  my: "မြန်မာ",
  vi: "Tiếng Việt",
};

// None of the four supported locales are RTL today. This is the seam a
// future RTL locale (Arabic/Hebrew/Urdu) would extend - callers should read
// direction from here rather than assuming "ltr", so adding one is a data
// change, not a rewrite. The component styling itself still uses physical
// Tailwind properties (ml-/mr-/pl-/pr-) throughout the app; migrating those
// to logical properties (ms-/me-/ps-/pe-) is real work still to do if/when
// an RTL locale actually ships - flagging it here rather than silently
// leaving it undiscoverable.
const RTL_LOCALES: Locale[] = [];

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function textDirection(locale: Locale): "ltr" | "rtl" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
