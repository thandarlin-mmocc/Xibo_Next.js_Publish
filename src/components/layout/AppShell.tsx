"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/i18n/getDictionary";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AppShell({
  titleKey,
  roleLabelKey,
  children,
}: {
  titleKey: TranslationKey;
  roleLabelKey: TranslationKey;
  children: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t(titleKey)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher className="hidden sm:inline-flex" />
              <span className="text-sm text-gray-500 hidden sm:block">
                {t(roleLabelKey)}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center text-gray-600 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">{t("common.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
