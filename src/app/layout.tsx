import type { Metadata } from "next";

import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import LocaleProvider from "@/components/providers/LocaleProvider";
import { resolveLocaleContext } from "@/i18n/resolveLocale";
import { textDirection } from "@/i18n/locales";

export const metadata: Metadata = {
  title: "OCC Xibo",
  description: "School & airport digital signage platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, timezone } = await resolveLocaleContext();

  return (
    <html lang={locale} dir={textDirection(locale)}>
      <body>
        <SessionProvider>
          <LocaleProvider initialLocale={locale} timezone={timezone}>
            {children}
          </LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
