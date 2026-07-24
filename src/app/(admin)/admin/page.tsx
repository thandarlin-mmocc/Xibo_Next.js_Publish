import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { getAlertableFlights } from "@/lib/flightSync";
import { getDictionary } from "@/i18n/getDictionary";
import { resolveLocaleContext } from "@/i18n/resolveLocale";
import { formatNumber } from "@/i18n/format";
import { ArtworkStatus, ToiletIssueStatus } from "@prisma/client";
import { AlertTriangle, ArrowRight, Image as ImageIcon, PlaneTakeoff, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const { locale } = await resolveLocaleContext();
  const t = getDictionary(locale);

  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });

  const [pendingArtworkCounts, openIssueCounts, alerts] = await Promise.all([
    prisma.artwork.groupBy({
      by: ["tenantId"],
      where: { status: ArtworkStatus.PENDING },
      _count: { _all: true },
    }),
    prisma.toiletIssue.groupBy({
      by: ["tenantId"],
      where: { status: { not: ToiletIssueStatus.RESOLVED } },
      _count: { _all: true },
    }),
    getAlertableFlights(),
  ]);

  const pendingByTenant = Object.fromEntries(
    pendingArtworkCounts.map((r) => [r.tenantId, r._count._all]),
  );
  const openIssuesByTenant = Object.fromEntries(
    openIssueCounts.map((r) => [r.tenantId, r._count._all]),
  );

  return (
    <AppShell titleKey="nav.centralAdmin" roleLabelKey="nav.roleAdmin">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{t["adminOverview.title"]}</h1>
      <p className="text-gray-500 text-sm mb-8">
        {t["adminOverview.subtitle"]}
      </p>

      {alerts.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {formatNumber(alerts.length, locale)} {t["adminOverview.flightsNeedAttention"]}{" "}
            <Link href="/ops" className="font-bold underline">
              {t["adminOverview.viewFlightBoard"]}
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {tenants.map((tenant) => {
          const isSchool = tenant.type === "SCHOOL";
          const pending = pendingByTenant[tenant.id] ?? 0;
          const openIssues = openIssuesByTenant[tenant.id] ?? 0;

          return (
            <div
              key={tenant.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900">{tenant.name}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-400">{tenant.type}</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                  {isSchool ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <PlaneTakeoff className="w-5 h-5" />
                  )}
                </div>
              </div>

              {isSchool ? (
                <Link
                  href="/admin/artworks"
                  className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    {pending > 0 ? (
                      <span className="font-bold text-amber-600">
                        {formatNumber(pending, locale)} {t["adminOverview.pendingApprovals"]}
                      </span>
                    ) : (
                      t["adminOverview.noPendingApprovals"]
                    )}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/ops/toilets"
                    className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {openIssues > 0 ? (
                        <span className="font-bold text-amber-600">
                          {formatNumber(openIssues, locale)} {t["adminOverview.openIssues"]}
                        </span>
                      ) : (
                        t["adminOverview.noOpenIssues"]
                      )}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </Link>
                  <Link
                    href="/ops"
                    className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{t["adminOverview.flightBoardLink"]}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
        {tenants.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {t["adminOverview.noTenants"]}
          </div>
        )}
      </div>
    </AppShell>
  );
}
