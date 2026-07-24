"use client";

import { useEffect, useState } from "react";
import { DICTIONARY, LOCALES, type FidsLocale } from "./dictionary";

type Flight = {
  flightKey: string;
  airline: string | null;
  flightNo: string | null;
  status: string | null;
  gate: string | null;
  scheduledTime: string | null;
  delayMinutes: number | null;
};

type CachedFids = {
  flights: Flight[];
  alerts: Flight[];
  updatedAt: string;
};

const REFRESH_MS = 15_000;
const LOCALE_ROTATE_MS = 8_000;
const CACHE_KEY = "fids_cache_v1";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "text-slate-200",
  BOARDING: "text-emerald-400",
  DELAYED: "text-amber-400",
  DEPARTED: "text-sky-400",
  CANCELLED: "text-red-400",
};

function loadCache(): CachedFids | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(data: CachedFids) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (e.g. private mode) - fine, just no offline fallback this run.
  }
}

export default function FidsDisplayPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [alerts, setAlerts] = useState<Flight[]>([]);
  const [localeIndex, setLocaleIndex] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Show last-known-good data immediately on load, before the network
  // even has a chance to respond - avoids a blank screen while it fetches.
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setFlights(cached.flights);
      setAlerts(cached.alerts);
      setUpdatedAt(cached.updatedAt);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/public/fids");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const nextFlights = data.flights ?? [];
        const nextAlerts = data.alerts ?? [];
        const now = new Date().toISOString();

        setFlights(nextFlights);
        setAlerts(nextAlerts);
        setUpdatedAt(now);
        setOffline(false);
        saveCache({ flights: nextFlights, alerts: nextAlerts, updatedAt: now });
      } catch {
        // Fetch failed (network/DB down) - keep showing whatever's already
        // on screen (fresh state or the cache loaded on mount) rather than
        // going blank, and flag it as stale.
        setOffline(true);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setLocaleIndex((i) => (i + 1) % LOCALES.length),
      LOCALE_ROTATE_MS,
    );
    return () => clearInterval(interval);
  }, []);

  const locale: FidsLocale = LOCALES[localeIndex];
  const t = DICTIONARY[locale];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8">
      <header className="flex items-baseline justify-between mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-4xl font-extrabold tracking-tight">{t.title}</h1>
        <div className="flex items-center gap-3">
          {offline && (
            <span className="text-xs uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/40 rounded px-2 py-0.5">
              {t.offline}
            </span>
          )}
          {updatedAt && (
            <span className="text-slate-600 text-xs tabular-nums">
              {offline ? t.lastUpdated : t.updated}{" "}
              {new Date(updatedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <span className="text-slate-500 text-sm uppercase tracking-widest">{locale}</span>
        </div>
      </header>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <div
              key={a.flightKey}
              className="bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded-lg px-5 py-3 text-lg font-semibold flex items-center gap-3"
            >
              <span className="uppercase text-xs tracking-widest bg-amber-500 text-slate-950 rounded px-2 py-0.5">
                {t.alertPrefix}
              </span>
              {a.airline} {a.flightNo} —{" "}
              {t.statusLabels[a.status ?? ""] ?? a.status}
              {a.gate ? ` · ${t.gate} ${a.gate}` : ""}
              {a.status === "DELAYED" && a.delayMinutes ? ` (+${a.delayMinutes}m)` : ""}
            </div>
          ))}
        </div>
      )}

      <table className="w-full text-2xl">
        <thead>
          <tr className="text-slate-500 text-base uppercase tracking-wider border-b border-slate-800">
            <th className="text-left py-3 font-medium">{t.flight}</th>
            <th className="text-left py-3 font-medium">{t.gate}</th>
            <th className="text-left py-3 font-medium">{t.scheduled}</th>
            <th className="text-left py-3 font-medium">{t.status}</th>
          </tr>
        </thead>
        <tbody>
          {flights.map((f) => (
            <tr key={f.flightKey} className="border-b border-slate-900">
              <td className="py-4 font-bold">
                {f.airline} {f.flightNo}
              </td>
              <td className="py-4 text-slate-300">{f.gate ?? "—"}</td>
              <td className="py-4 text-slate-300 tabular-nums">
                {f.scheduledTime
                  ? new Date(f.scheduledTime).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
              <td className={`py-4 font-bold ${STATUS_COLORS[f.status ?? ""] ?? ""}`}>
                {t.statusLabels[f.status ?? ""] ?? f.status ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {flights.length === 0 && (
        <p className="text-slate-500 text-center py-20 text-xl">{t.noFlights}</p>
      )}
    </div>
  );
}
