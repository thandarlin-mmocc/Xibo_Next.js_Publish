"use client";

import AppShell from "@/components/layout/AppShell";
import BackLink from "@/components/layout/BackLink";
import { useLocale } from "@/components/providers/LocaleProvider";
import { canManageDevices, roleHomePath } from "@/lib/authz";
import { DeviceStatus, UserRole } from "@prisma/client";
import { Loader2, MonitorSmartphone, Pause, Play, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Tenant = { id: string; name: string; type: string };

type Device = {
  id: string;
  name: string | null;
  status: DeviceStatus;
  lastHeartbeatAt: string | null;
  cpuPct: number | null;
  ramPct: number | null;
  diskPct: number | null;
};

export default function DevicesPage() {
  const { t, formatDateTime } = useLocale();
  const { data: sessionData } = useSession();
  const role = sessionData?.user?.role as UserRole | undefined;
  const isAdmin = role === UserRole.ADMIN;
  const allowed = role ? canManageDevices(role) : false;
  const backHref = role ? roleHomePath(role, sessionData?.user?.tenantType) : "/dashboard";

  const [devices, setDevices] = useState<Device[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationCode, setRegistrationCode] = useState("");
  const [name, setName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    const res = await fetch("/api/devices");
    if (res.ok) setDevices(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (!allowed) return;
    fetchDevices();
  }, [allowed]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/tenants")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTenants);
  }, [isAdmin]);

  const claimDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationCode.trim() || !name.trim()) return;
    if (isAdmin && !tenantId) return;
    setClaiming(true);
    const res = await fetch("/api/devices/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registrationCode: registrationCode.trim(),
        name: name.trim(),
        ...(isAdmin ? { tenantId } : {}),
      }),
    });
    if (res.ok) {
      setRegistrationCode("");
      setName("");
      setTenantId("");
      fetchDevices();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("devices.claimFailed"));
    }
    setClaiming(false);
  };

  const setStatus = async (id: string, status: DeviceStatus) => {
    const confirmMsg =
      status === DeviceStatus.SUSPENDED ? t("devices.confirmSuspend") : t("devices.confirmReactivate");
    if (!confirm(confirmMsg)) return;
    setBusyId(id);
    const res = await fetch(`/api/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchDevices();
    else alert(t("devices.actionFailed"));
    setBusyId(null);
  };

  if (!allowed) {
    return (
      <AppShell titleKey="nav.devices" roleLabelKey="nav.roleContentManager">
        <div className="text-center py-16 text-gray-400">{t("common.unauthorized")}</div>
      </AppShell>
    );
  }

  return (
    <AppShell titleKey="nav.devices" roleLabelKey="nav.roleContentManager">
      <BackLink href={backHref} label={t("common.back")} />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="font-bold text-gray-900 mb-1">{t("devices.claimSectionTitle")}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("devices.claimSectionHint")}</p>
        <form onSubmit={claimDevice} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={registrationCode}
            onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())}
            placeholder={t("devices.registrationCodePlaceholder")}
            className="p-2 border border-gray-300 rounded-lg text-black text-sm font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("devices.namePlaceholder")}
            className="p-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {isAdmin && (
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
              className="p-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">{t("users.tenantLabel")}</option>
              {tenants.map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={claiming}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t("devices.claimButton")}
          </button>
        </form>
      </div>

      <h2 className="font-bold text-gray-900 mb-4">{t("devices.fleetSectionTitle")}</h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
          {t("devices.emptyState")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                    <MonitorSmartphone className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-gray-900">{d.name}</p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    d.status === DeviceStatus.ACTIVE
                      ? "bg-green-50 text-green-700"
                      : d.status === DeviceStatus.SUSPENDED
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {d.status === DeviceStatus.ACTIVE
                    ? t("devices.statusActive")
                    : d.status === DeviceStatus.SUSPENDED
                      ? t("devices.statusSuspended")
                      : t("devices.statusRejected")}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {t("devices.lastSeenLabel")}{" "}
                {d.lastHeartbeatAt ? formatDateTime(d.lastHeartbeatAt) : t("devices.neverSeen")}
              </p>
              {d.status === DeviceStatus.ACTIVE ? (
                <button
                  onClick={() => setStatus(d.id, DeviceStatus.SUSPENDED)}
                  disabled={busyId === d.id}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:underline disabled:opacity-50"
                >
                  <Pause className="w-3.5 h-3.5" /> {t("devices.suspendButton")}
                </button>
              ) : d.status === DeviceStatus.SUSPENDED ? (
                <button
                  onClick={() => setStatus(d.id, DeviceStatus.ACTIVE)}
                  disabled={busyId === d.id}
                  className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:underline disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" /> {t("devices.reactivateButton")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
