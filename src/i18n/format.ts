import type { Locale } from "./locales";

export function formatDate(date: Date | string, locale: Locale, timezone?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: timezone }).format(d);
}

export function formatDateTime(
  date: Date | string,
  locale: Locale,
  timezone?: string,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(d);
}

export function formatTime(date: Date | string, locale: Locale, timezone?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: timezone }).format(d);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}
