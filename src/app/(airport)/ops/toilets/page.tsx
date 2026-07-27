"use client";

import AppShell from "@/components/layout/AppShell";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Loader2, QrCode, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Tenant = { id: string; name: string; type: string };

type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

type ToiletIssue = {
  id: number;
  locationId: string;
  type: string;
  note: string | null;
  status: IssueStatus;
  createdAt: string;
};

export default function ToiletOpsPage() {
  const { formatDateTime, t } = useLocale();
  const { data: sessionData } = useSession();
  const isAdmin = sessionData?.user?.role === "ADMIN";

  const [issues, setIssues] = useState<ToiletIssue[]>([]);
  const [filter, setFilter] = useState<IssueStatus>("OPEN");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [qrLocation, setQrLocation] = useState("");
  const [qrTenantId, setQrTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [qrResult, setQrResult] = useState<{ dataUrl: string; reportUrl: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/tenants")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTenants);
  }, [isAdmin]);

  const TYPE_LABELS: Record<string, string> = {
    NO_TISSUE: t("issueType.noTissue"),
    SMELL: t("issueType.smell"),
    LEAK: t("issueType.leak"),
    DIRTY: t("issueType.dirty"),
  };

  const STATUS_LABELS: Record<IssueStatus, string> = {
    OPEN: t("issueStatus.open"),
    IN_PROGRESS: t("issueStatus.inProgress"),
    RESOLVED: t("issueStatus.resolved"),
  };

  const fetchIssues = async () => {
    setLoading(true);
    const res = await fetch(`/api/toilet-issues?status=${filter}`);
    if (res.ok) setIssues(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, [filter]);

  const advance = async (issue: ToiletIssue) => {
    const nextStatus: IssueStatus = issue.status === "OPEN" ? "IN_PROGRESS" : "RESOLVED";
    setProcessingId(issue.id);
    const res = await fetch(`/api/toilet-issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) fetchIssues();
    setProcessingId(null);
  };

  const generateQr = async () => {
    if (!qrLocation.trim()) return;
    if (isAdmin && !qrTenantId) return;
    setQrLoading(true);
    const res = await fetch("/api/toilet-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: qrLocation.trim(),
        ...(isAdmin ? { tenantId: qrTenantId } : {}),
      }),
    });
    if (res.ok) setQrResult(await res.json());
    setQrLoading(false);
  };

  return (
    <AppShell titleKey="nav.restroomOps" roleLabelKey="nav.roleOps">
      <div className="flex justify-end mb-4">
        <Link href="/ops/toilets/clean" className="text-sm text-blue-600 hover:underline">
          {t("toilets.openCleaningModeLink")} →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex space-x-2 mb-6 bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-fit">
            {(["OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === f
                    ? "bg-black text-white shadow-md"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-bold text-gray-900">
                      {TYPE_LABELS[issue.type] ?? issue.type}
                    </p>
                    <p className="text-sm text-gray-500 font-mono">{issue.locationId}</p>
                    {issue.note && <p className="text-sm text-gray-600 mt-1">{issue.note}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(issue.createdAt)}
                    </p>
                  </div>
                  {issue.status !== "RESOLVED" && (
                    <button
                      onClick={() => advance(issue)}
                      disabled={processingId === issue.id}
                      className="shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processingId === issue.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : issue.status === "OPEN" ? (
                        t("action.start")
                      ) : (
                        t("action.resolve")
                      )}
                    </button>
                  )}
                </div>
              ))}
              {issues.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                  {t("toilets.noIssuesTemplate").replace("{status}", STATUS_LABELS[filter].toLowerCase())}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t("toilets.generateQrTitle")}</h2>
            </div>
            {isAdmin && (
              <select
                value={qrTenantId}
                onChange={(e) => setQrTenantId(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-lg text-black text-sm mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">{t("users.tenantLabel")}</option>
                {tenants.map((tn) => (
                  <option key={tn.id} value={tn.id}>
                    {tn.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={qrLocation}
              onChange={(e) => setQrLocation(e.target.value)}
              placeholder="T1-L2-MALE-03"
              className="w-full p-2 border border-gray-300 rounded-lg text-black text-sm mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={generateQr}
              disabled={qrLoading}
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {t("toilets.generateButton")}
            </button>
            {qrResult && (
              <div className="mt-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrResult.dataUrl} alt="QR code" className="mx-auto w-40 h-40" />
                <a
                  href={qrResult.dataUrl}
                  download={`${qrLocation}.png`}
                  className="text-xs text-blue-600 hover:underline block mt-2"
                >
                  {t("common.download")}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
