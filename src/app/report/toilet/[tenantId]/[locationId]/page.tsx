import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/getDictionary";
import { resolveLocaleContext } from "@/i18n/resolveLocale";
import { notFound } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ReportForm from "./ReportForm";

interface PageProps {
  params: Promise<{ tenantId: string; locationId: string }>;
}

export default async function ToiletReportPage({ params }: PageProps) {
  const { tenantId, locationId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) notFound();

  const { locale } = await resolveLocaleContext(tenantId);
  const t = getDictionary(locale);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>
        <p className="text-center text-sm text-gray-500 mb-1">{tenant.name}</p>
        <h1 className="text-center text-xl font-extrabold text-gray-900 mb-1">
          {t["report.pageTitle"]}
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          {t["report.locationLabel"]} <span className="font-mono">{locationId}</span>
        </p>
        <ReportForm tenantId={tenantId} locationId={locationId} />
      </div>
    </div>
  );
}
