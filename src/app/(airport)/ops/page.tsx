"use client";

import AppShell from "@/components/layout/AppShell";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ExternalLink, Loader2, PlaneTakeoff } from "lucide-react";
import { useEffect, useState } from "react";

type FlightStatus = "SCHEDULED" | "BOARDING" | "DELAYED" | "DEPARTED" | "CANCELLED";

type FlightSnapshot = {
  flightKey: string;
  airline: string | null;
  flightNo: string | null;
  status: FlightStatus | null;
  gate: string | null;
  scheduledTime: string | null;
  delayMinutes: number | null;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-700 border-gray-200",
  BOARDING: "bg-green-100 text-green-700 border-green-200",
  DELAYED: "bg-amber-100 text-amber-700 border-amber-200",
  DEPARTED: "bg-blue-100 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const emptyForm = {
  flightKey: "",
  airline: "",
  flightNo: "",
  status: "SCHEDULED" as FlightStatus,
  gate: "",
  scheduledTime: "",
  delayMinutes: "",
};

export default function OpsPage() {
  const { formatDateTime, t } = useLocale();
  const [flights, setFlights] = useState<FlightSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const STATUS_LABELS: Record<string, string> = {
    SCHEDULED: t("flightStatus.scheduled"),
    BOARDING: t("flightStatus.boarding"),
    DELAYED: t("flightStatus.delayed"),
    DEPARTED: t("flightStatus.departed"),
    CANCELLED: t("flightStatus.cancelled"),
  };

  const fetchFlights = async () => {
    setLoading(true);
    const res = await fetch("/api/flights");
    if (res.ok) setFlights(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.flightKey.trim()) return;

    setSaving(true);
    const res = await fetch("/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightKey: form.flightKey.trim(),
        airline: form.airline.trim() || null,
        flightNo: form.flightNo.trim() || null,
        status: form.status,
        gate: form.gate.trim() || null,
        scheduledTime: form.scheduledTime || null,
        delayMinutes: form.delayMinutes ? Number(form.delayMinutes) : null,
      }),
    });

    if (res.ok) {
      setForm(emptyForm);
      fetchFlights();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("ops.saveFlightFailed"));
    }
    setSaving(false);
  };

  return (
    <AppShell titleKey="nav.airportOps" roleLabelKey="nav.roleOps">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <PlaneTakeoff className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{t("ops.updateFlightTitle")}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("ops.flightKeyLabel")}
                </label>
                <input
                  type="text"
                  value={form.flightKey}
                  onChange={(e) => setForm({ ...form, flightKey: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="NH123-2026-07-21"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("ops.airlineLabel")}</label>
                  <input
                    type="text"
                    value={form.airline}
                    onChange={(e) => setForm({ ...form, airline: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="ANA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("ops.flightNoLabel")}</label>
                  <input
                    type="text"
                    value={form.flightNo}
                    onChange={(e) => setForm({ ...form, flightNo: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="NH123"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("ops.statusLabel")}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as FlightStatus })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="SCHEDULED">{t("flightStatus.scheduled")}</option>
                    <option value="BOARDING">{t("flightStatus.boarding")}</option>
                    <option value="DELAYED">{t("flightStatus.delayed")}</option>
                    <option value="DEPARTED">{t("flightStatus.departed")}</option>
                    <option value="CANCELLED">{t("flightStatus.cancelled")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("ops.gateLabel")}</label>
                  <input
                    type="text"
                    value={form.gate}
                    onChange={(e) => setForm({ ...form, gate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="22"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("ops.scheduledTimeLabel")}</label>
                <input
                  type="datetime-local"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              {form.status === "DELAYED" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("ops.delayMinutesLabel")}</label>
                  <input
                    type="number"
                    min={0}
                    value={form.delayMinutes}
                    onChange={(e) => setForm({ ...form, delayMinutes: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t("ops.saveFlightButton")}
              </button>
            </form>

            <a
              href="/display/fids"
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-1 text-sm text-blue-600 hover:underline"
            >
              {t("ops.viewFidsLink")} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            {t("ops.flightBoardTitle")}
            <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {flights.length}
            </span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left p-3">{t("ops.colFlight")}</th>
                    <th className="text-left p-3">{t("ops.gateLabel")}</th>
                    <th className="text-left p-3">{t("ops.colScheduled")}</th>
                    <th className="text-left p-3">{t("ops.statusLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((f) => (
                    <tr key={f.flightKey} className="border-t border-gray-100">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">
                          {f.airline} {f.flightNo}
                        </div>
                        <div className="text-xs text-gray-400">{f.flightKey}</div>
                      </td>
                      <td className="p-3">{f.gate ?? "-"}</td>
                      <td className="p-3">
                        {f.scheduledTime ? formatDateTime(f.scheduledTime) : "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold uppercase border ${
                            STATUS_COLORS[f.status ?? ""] ?? STATUS_COLORS.SCHEDULED
                          }`}
                        >
                          {STATUS_LABELS[f.status ?? ""] ?? STATUS_LABELS.SCHEDULED}
                          {f.status === "DELAYED" && f.delayMinutes
                            ? ` +${f.delayMinutes}m`
                            : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {flights.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400">
                        {t("ops.noFlights")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
