"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { AlertTriangle, Check, Droplets, Loader2, Trash2, Wind } from "lucide-react";
import { useState } from "react";

export default function ReportForm({
  tenantId,
  locationId,
}: {
  tenantId: string;
  locationId: string;
}) {
  const { t } = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const ISSUE_TYPES = [
    { value: "NO_TISSUE", label: t("issueType.noTissue"), icon: AlertTriangle },
    { value: "SMELL", label: t("issueType.smell"), icon: Wind },
    { value: "LEAK", label: t("issueType.leak"), icon: Droplets },
    { value: "DIRTY", label: t("issueType.dirty"), icon: Trash2 },
  ] as const;

  const submit = async (type: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/toilet-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, locationId, type, note: note.trim() || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("report.submitFailed"));
      }
    } catch {
      setError(t("report.submitFailed"));
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="bg-green-100 text-green-600 rounded-full p-4">
          <Check className="w-8 h-8" />
        </div>
        <p className="text-lg font-bold text-gray-900">{t("report.thankYou")}</p>
        <p className="text-gray-500 text-sm">{t("report.staffNotified")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {ISSUE_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => submit(value)}
            disabled={loading}
            className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            ) : (
              <Icon className="w-8 h-8 text-gray-600" />
            )}
            <span className="text-sm font-semibold text-gray-800 text-center">{label}</span>
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("report.notePlaceholder")}
        rows={2}
        className="w-full p-3 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
