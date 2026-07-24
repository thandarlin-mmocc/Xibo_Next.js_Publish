"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

function timeAgo(iso: string | undefined, t: (key: any) => string): string {
  if (!iso) return t("clean.neverCleaned");
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return t("clean.justNow");
  if (minutes < 60) return t("clean.minutesAgo").replace("{m}", String(minutes));
  const hours = Math.round(minutes / 60);
  return t("clean.hoursAgo").replace("{h}", String(hours));
}

export default function StaffCleaningPage() {
  const { t } = useLocale();
  const [locations, setLocations] = useState<string[]>([]);
  const [lastCleaned, setLastCleaned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submittingLocation, setSubmittingLocation] = useState<string | null>(null);
  const [justCleaned, setJustCleaned] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState("");

  const fetchBoard = async () => {
    const res = await fetch("/api/toilet-cleanings");
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations ?? []);
      setLastCleaned(data.lastCleanedByLocation ?? {});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const logCleaning = async (locationId: string) => {
    setSubmittingLocation(locationId);
    const res = await fetch("/api/toilet-cleanings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    });
    if (res.ok) {
      setLastCleaned((prev) => ({ ...prev, [locationId]: new Date().toISOString() }));
      setJustCleaned(locationId);
      setTimeout(() => setJustCleaned(null), 2000);
      if (!locations.includes(locationId)) {
        setLocations((prev) => [...prev, locationId].sort());
      }
    }
    setSubmittingLocation(null);
  };

  const addLocation = () => {
    const id = newLocation.trim();
    if (!id) return;
    logCleaning(id);
    setNewLocation("");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">{t("clean.title")}</h1>
        <LanguageSwitcher className="text-slate-300" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => logCleaning(loc)}
              disabled={submittingLocation === loc}
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-6 min-h-[140px] font-bold transition-all ${
                justCleaned === loc
                  ? "bg-green-600"
                  : "bg-slate-800 hover:bg-slate-700 active:scale-95"
              }`}
            >
              {submittingLocation === loc ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : justCleaned === loc ? (
                <Check className="w-8 h-8" />
              ) : (
                <Sparkles className="w-8 h-8 text-blue-400" />
              )}
              <span className="font-mono text-sm">{loc}</span>
              <span className="text-xs font-normal text-slate-400">
                {justCleaned === loc ? t("clean.loggedConfirmation") : timeAgo(lastCleaned[loc], t)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-2 max-w-md">
        <input
          type="text"
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          placeholder={t("clean.newLocationPlaceholder")}
          className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addLocation}
          className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 flex items-center gap-1 font-bold text-sm"
        >
          <Plus className="w-4 h-4" /> {t("clean.logButton")}
        </button>
      </div>
    </div>
  );
}
