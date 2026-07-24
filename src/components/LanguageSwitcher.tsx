"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n/locales";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className={`inline-flex items-center gap-1.5 text-sm text-gray-500 ${className}`}>
      <Globe className="w-4 h-4" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="bg-transparent outline-none cursor-pointer font-medium text-inherit"
        aria-label={t("common.language")}
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
