"use client";

import AppShell from "@/components/layout/AppShell";
import BackLink from "@/components/layout/BackLink";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/i18n/getDictionary";
import { UserRole } from "@prisma/client";
import { Loader2, Pencil, Plus, UserX, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";

type Tenant = { id: string; name: string; type: string };

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
  locale: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  tenant: Tenant | null;
};

const ROLE_KEYS: Record<UserRole, TranslationKey> = {
  ADMIN: "role.ADMIN",
  SCHOOL_ADMIN: "role.SCHOOL_ADMIN",
  TEACHER: "role.TEACHER",
  STUDENT: "role.STUDENT",
  AIRPORT_ADMIN: "role.AIRPORT_ADMIN",
  OPS: "role.OPS",
  CONTENT_EDITOR: "role.CONTENT_EDITOR",
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "TEACHER" as UserRole,
  tenantId: "",
};

export default function UsersManagementPage() {
  const { t, formatDateTime } = useLocale();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    const [usersRes, tenantsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/tenants"),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (tenantsRes.ok) setTenants(await tenantsRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingId(u.id);
    setForm({
      name: u.name ?? "",
      email: u.email,
      password: "",
      role: u.role,
      tenantId: u.tenantId ?? "",
    });
    setError("");
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      role: form.role,
      tenantId: form.role === "ADMIN" ? null : form.tenantId || null,
    };
    if (!editingId) {
      payload.email = form.email.trim().toLowerCase();
      payload.password = form.password;
    }
    if (editingId && form.password) {
      payload.password = form.password;
    }

    const res = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setFormOpen(false);
      fetchAll();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? (editingId ? t("users.updateFailed") : t("users.createFailed")));
    }
    setSaving(false);
  };

  const toggleActive = async (u: UserRow) => {
    const confirmMsg = u.isActive ? t("users.confirmDeactivate") : t("users.confirmActivate");
    if (!confirm(confirmMsg)) return;

    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) fetchAll();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("users.updateFailed"));
    }
  };

  return (
    <AppShell titleKey="nav.centralAdmin" roleLabelKey="nav.roleAdmin">
      <BackLink href="/admin" label={t("adminArtworks.overviewLink")} />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-gray-900">{t("users.pageTitle")}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> {t("users.newUserButton")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left p-3">{t("users.colName")}</th>
                <th className="text-left p-3">{t("users.colEmail")}</th>
                <th className="text-left p-3">{t("users.colRole")}</th>
                <th className="text-left p-3">{t("users.colTenant")}</th>
                <th className="text-left p-3">{t("users.colStatus")}</th>
                <th className="text-left p-3">{t("users.colLastLogin")}</th>
                <th className="text-left p-3">{t("users.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="p-3 font-medium text-gray-900">{u.name}</td>
                  <td className="p-3 text-gray-600">{u.email}</td>
                  <td className="p-3">{t(ROLE_KEYS[u.role])}</td>
                  <td className="p-3 text-gray-600">{u.tenant?.name ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold uppercase border ${
                        u.isActive
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {u.isActive ? t("users.statusActive") : t("users.statusInactive")}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : t("users.neverLoggedIn")}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-gray-400 hover:text-blue-600"
                        title={t("users.editButton")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className={u.isActive ? "text-gray-400 hover:text-red-600" : "text-gray-400 hover:text-green-600"}
                        title={u.isActive ? t("users.deactivateButton") : t("users.activateButton")}
                      >
                        {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {t("users.emptyState")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? t("users.editTitle") : t("users.createTitle")}
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("users.nameLabel")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder={t("users.namePlaceholder")}
                  className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("users.emailLabel")}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder={t("users.emailPlaceholder")}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("users.passwordLabel")}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                  placeholder={editingId ? t("users.passwordPlaceholderEdit") : t("users.passwordPlaceholderCreate")}
                  className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("users.roleLabel")}</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {Object.values(UserRole).map((r) => (
                      <option key={r} value={r}>
                        {t(ROLE_KEYS[r])}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("users.tenantLabel")}</label>
                  <select
                    value={form.tenantId}
                    onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                    disabled={form.role === "ADMIN"}
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">{t("users.tenantNone")}</option>
                    {tenants.map((tn) => (
                      <option key={tn.id} value={tn.id}>
                        {tn.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
