import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from "./locales";

export const LOCALE_COOKIE = "app_locale";

/**
 * Resolution order: explicit cookie choice (works for anonymous visitors
 * too - vote/report/login pages) > the signed-in user's own saved
 * preference > their tenant's default > "en". Timezone always follows the
 * tenant (it's "what timezone is this operation in," not a personal
 * preference) - platform ADMIN has no tenant, so falls back to UTC.
 *
 * `explicitTenantId` lets anonymous, tenant-scoped public pages (vote,
 * toilet report) fall back to that tenant's own locale/timezone instead of
 * the global default when the visitor hasn't picked a language yet - e.g. a
 * QR code at a Japanese school should default to Japanese, not English.
 * Ignored when a session is present (the session's own tenant wins).
 */
export async function resolveLocaleContext(explicitTenantId?: string): Promise<{
  locale: Locale;
  timezone: string;
}> {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;

  const session = await getServerSession(authOptions);

  const tenantId = session?.user?.tenantId ?? explicitTenantId;
  let tenant: { locale: string; timezone: string } | null = null;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { locale: true, timezone: true },
    });
  }

  const locale: Locale = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : isSupportedLocale(session?.user?.locale)
      ? (session!.user.locale as Locale)
      : isSupportedLocale(tenant?.locale)
        ? (tenant!.locale as Locale)
        : DEFAULT_LOCALE;

  const timezone = tenant?.timezone ?? "UTC";

  return { locale, timezone };
}
