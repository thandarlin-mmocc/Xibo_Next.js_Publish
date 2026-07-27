"use client";

import AppShell from "@/components/layout/AppShell";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MediaType } from "@prisma/client";
import { Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

type MediaAsset = {
  id: string;
  type: MediaType;
  title: string;
};

type PlaylistItem = {
  id: string;
  order: number;
  durationSeconds: number;
  mediaAsset: MediaAsset;
};

type Playlist = {
  id: string;
  name: string;
  publishedAt: string | null;
  items: PlaylistItem[];
};

export default function PlaylistsPage() {
  const { t, formatDateTime, formatNumber } = useLocale();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [playlistsRes, mediaRes] = await Promise.all([
      fetch("/api/playlists"),
      fetch("/api/media"),
    ]);
    if (playlistsRes.ok) setPlaylists(await playlistsRes.json());
    if (mediaRes.ok) setMedia(await mediaRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const createPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      fetchAll();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("playlists.createFailed"));
    }
    setCreating(false);
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm(t("playlists.confirmDelete"))) return;
    const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (res.ok) fetchAll();
    else alert(t("playlists.deleteFailed"));
  };

  const addItem = async (playlistId: string) => {
    if (!selectedMediaId) return;
    const res = await fetch(`/api/playlists/${playlistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaAssetId: selectedMediaId, durationSeconds: 10 }),
    });
    if (res.ok) {
      setPickerFor(null);
      setSelectedMediaId("");
      fetchAll();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("playlists.addFailed"));
    }
  };

  const removeItem = async (playlistId: string, itemId: string) => {
    if (!confirm(t("playlists.confirmRemoveItem"))) return;
    const res = await fetch(`/api/playlists/${playlistId}/items/${itemId}`, { method: "DELETE" });
    if (res.ok) fetchAll();
    else alert(t("playlists.removeFailed"));
  };

  const publish = async (playlistId: string) => {
    if (!confirm(t("playlists.confirmPublish"))) return;
    setBusyId(playlistId);
    const res = await fetch(`/api/playlists/${playlistId}/publish`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert(t("playlists.publishSuccess"));
      fetchAll();
    } else {
      alert(data.error ?? t("playlists.publishFailed"));
    }
    setBusyId(null);
  };

  return (
    <AppShell titleKey="nav.playlists" roleLabelKey="nav.roleContentManager">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-gray-900">{t("playlists.pageTitle")}</h1>
        <form onSubmit={createPlaylist} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("playlists.namePlaceholder")}
            className="p-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {t("playlists.newButton")}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {playlists.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatNumber(p.items.length)} {t("playlists.itemCount")} ·{" "}
                    {p.publishedAt
                      ? `${t("playlists.publishedLabel")} ${formatDateTime(p.publishedAt)}`
                      : t("playlists.neverPublished")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => publish(p.id)}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-green-700 disabled:opacity-50"
                  >
                    {busyId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {t("playlists.publishButton")}
                  </button>
                  <button
                    onClick={() => deletePlaylist(p.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {p.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">
                      {item.mediaAsset.title}{" "}
                      <span className="text-gray-400 text-xs">({item.durationSeconds}s)</span>
                    </span>
                    <button
                      onClick={() => removeItem(p.id, item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {p.items.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">{t("playlists.emptyItemsState")}</p>
                )}
              </div>

              {pickerFor === p.id ? (
                <div className="flex gap-2 mt-3">
                  <select
                    value={selectedMediaId}
                    onChange={(e) => setSelectedMediaId(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">{t("playlists.selectMediaLabel")}</option>
                    {media.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => addItem(p.id)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
                  >
                    {t("common.save")}
                  </button>
                  <button
                    onClick={() => setPickerFor(null)}
                    className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPickerFor(p.id)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("playlists.addMediaButton")}
                </button>
              )}
            </div>
          ))}
          {playlists.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
              {t("playlists.emptyState")}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
