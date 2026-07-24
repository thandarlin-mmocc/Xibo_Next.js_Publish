"use client";

import { formatDate, formatDateTime, formatNumber, formatTime } from "@/i18n/format";
import { getDictionary, type TranslationKey } from "@/i18n/getDictionary";
import { textDirection, type Locale } from "@/i18n/locales";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type LocaleContextValue = {
  locale: Locale;
  timezone: string;
  dir: "ltr" | "rtl";
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
  formatDate: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  formatNumber: (value: number) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export default function LocaleProvider({
  initialLocale,
  timezone,
  children,
}: {
  initialLocale: Locale;
  timezone: string;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next); // instant feedback, before the network round-trip
      fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).finally(() => router.refresh()); // re-run server components (lang/dir, server-rendered pages)
    },
    [router],
  );

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      timezone,
      dir: textDirection(locale),
      t: (key: TranslationKey) => dictionary[key] ?? key,
      setLocale,
      formatDate: (date) => formatDate(date, locale, timezone),
      formatDateTime: (date) => formatDateTime(date, locale, timezone),
      formatTime: (date) => formatTime(date, locale, timezone),
      formatNumber: (value) => formatNumber(value, locale),
    }),
    [locale, timezone, dictionary, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
