import { authOptions } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/i18n/resolveLocale";
import { isSupportedLocale } from "@/i18n/locales";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Sets the locale cookie (works for anonymous visitors too - login/vote/
 * report pages) and, if signed in, persists it to the user's own profile so
 * it follows them across devices. The cookie is always the immediate source
 * of truth; the DB write is best-effort and doesn't block the response.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}) as any);
  const locale = body?.locale;

  if (!isSupportedLocale(locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await prisma.user
      .update({ where: { id: session.user.id }, data: { locale } })
      .catch((error) => console.error("Failed to persist user locale:", error));
  }

  return NextResponse.json({ success: true, locale });
}
