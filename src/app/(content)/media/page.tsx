"use client";

import AppShell from "@/components/layout/AppShell";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/i18n/getDictionary";
import { MediaType } from "@prisma/client";
import { FileText, Film, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Tenant = { id: string; name: string; type: string };

type MediaAsset = {
  id: string;
  type: MediaType;
  title: string;
  storagePath: string;
  mimeType: string | null;
  fileSize: number | null;
  tags: string[];
  createdAt: string;
};

const TYPE_KEYS: Record<MediaType, TranslationKey> = {
  IMAGE: "media.typeImage",
  VIDEO: "media.typeVideo",
  PDF: "media.typePdf",
};

const TYPE_ICONS: Record<MediaType, typeof ImageIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Film,
  PDF: FileText,
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function MediaLibraryPage() {
  const { t, formatDate } = useLocale();
  const { data: sessionData } = useSession();
  const isAdmin = sessionData?.user?.role === "ADMIN";

  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tenantId, setTenantId] = useState("");

  const fetchMedia = async () => {
    setLoading(true);
    const res = await fetch("/api/media");
    if (res.ok) setMedia(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/tenants")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTenants);
  }, [isAdmin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    if (isAdmin && !tenantId) {
      setError(t("users.tenantLabel"));
      return;
    }
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("tags", tags);
    formData.append("file", file);
    if (isAdmin) formData.append("tenantId", tenantId);

    const res = await fetch("/api/media", { method: "POST", body: formData });
    if (res.ok) {
      setFormOpen(false);
      setTitle("");
      setTags("");
      setFile(null);
      setTenantId("");
      fetchMedia();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("media.uploadFailed"));
    }
    setUploading(false);
  };

  const remove = async (m: MediaAsset) => {
    if (!confirm(t("media.confirmDelete"))) return;
    const res = await fetch(`/api/media/${m.id}`, { method: "DELETE" });
    if (res.ok) fetchMedia();
    else alert(t("media.deleteFailed"));
  };

  return (
    <AppShell titleKey="nav.mediaLibrary" roleLabelKey="nav.roleContentManager">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-gray-900">{t("media.pageTitle")}</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> {t("media.uploadButton")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((m) => {
            const Icon = TYPE_ICONS[m.type];
            return (
              <div
                key={m.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                  {m.type === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.storagePath} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-10 h-10 text-gray-400" />
                  )}
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold uppercase px-2 py-0.5 rounded">
                    {t(TYPE_KEYS[m.type])}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 line-clamp-1">{m.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatBytes(m.fileSize)} · {formatDate(m.createdAt)}
                  </p>
                  {m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.tags.map((tag) => (
                        <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => remove(m)}
                    className="mt-3 flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t("common.delete")}
                  </button>
                </div>
              </div>
            );
          })}
          {media.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
              {t("media.emptyState")}
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t("media.uploadButton")}</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("media.titleLabel")}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={t("media.titlePlaceholder")}
                  className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("users.tenantLabel")}</label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">{t("users.tenantLabel")}</option>
                    {tenants.map((tn) => (
                      <option key={tn.id} value={tn.id}>
                        {tn.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("media.fileLabel")}</label>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("media.tagsLabel")}</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t("media.tagsPlaceholder")}
                  className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
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
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
