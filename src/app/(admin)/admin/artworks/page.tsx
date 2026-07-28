"use client";

import AppShell from "@/components/layout/AppShell";
import BackLink from "@/components/layout/BackLink";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useEffect, useState } from "react";
import {
  Check,
  X,
  Loader2,
  Search,
  LayoutGrid,
  Square,
} from "lucide-react";

type ArtworkStatusFilter = "PENDING" | "APPROVED" | "REJECTED";

type Artwork = {
  id: string;
  title: string;
  studentName: string | null;
  imagePath: string;
  status: ArtworkStatusFilter;
  rejectReason?: string | null;
  xiboMediaId?: number | null;
  votingQrUrl?: string | null;
  tenant: { name: string } | null;
  createdAt: string;
};

export default function AdminPage() {
  const { t } = useLocale();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filter, setFilter] = useState<ArtworkStatusFilter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "large">("grid");

  const fetchArtworks = async () => {
    setLoading(true);
    const res = await fetch(`/api/artworks?status=${filter}`);
    if (res.ok) {
      setArtworks(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArtworks();
  }, [filter]);

  const handleReview = async (
    id: string,
    action: "approve" | "reject",
    reason?: string
  ) => {
    if (
      !confirm(action === "approve" ? t("adminArtworks.confirmApprove") : t("adminArtworks.confirmReject"))
    )
      return;
    setProcessingId(id);

    const res = await fetch(`/api/artworks/${id}/review`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectReason: reason }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {}

    if (res.ok) fetchArtworks();
    else alert(data.error ?? text);
    setProcessingId(null);
  };

  const getFilterLabel = (f: ArtworkStatusFilter) => {
    switch (f) {
      case "PENDING":
        return t("status.pending");
      case "APPROVED":
        return t("status.approved");
      case "REJECTED":
        return t("adminArtworks.filterRejected");
      default:
        return f;
    }
  };

  return (
    <AppShell titleKey="nav.centralAdmin" roleLabelKey="nav.roleAdmin">
      <BackLink href="/admin" label={t("adminArtworks.overviewLink")} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-fit">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                filter === f
                  ? "bg-black text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {getFilterLabel(f)}
            </button>
          ))}
        </div>

        <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm flex space-x-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
            title={t("common.gridView")}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("large")}
            className={`p-2.5 rounded-lg transition-all ${
              viewMode === "large"
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
            title={t("common.largeView")}
          >
            <Square className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div
          className={`grid gap-8 ${
            viewMode === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1 max-w-4xl mx-auto"
          }`}
        >
          {artworks.map((art) => (
            <div
              key={art.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
            >
              <div className="aspect-video bg-gray-100 overflow-hidden relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={art.imagePath}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">
                    {art.tenant?.name}
                  </p>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
                  {art.title}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {t("artwork.createdByLabel")} {art.studentName}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100">
                  {filter === "PENDING" && (
                    <div className="flex space-x-3">
                      <button
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-bold shadow-sm disabled:opacity-50"
                        onClick={() => handleReview(art.id, "approve")}
                        disabled={processingId === art.id}
                      >
                        {processingId === art.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" /> {t("action.approve")}
                          </>
                        )}
                      </button>
                      <button
                        className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center font-bold shadow-sm disabled:opacity-50"
                        onClick={() => {
                          const r = prompt(t("adminArtworks.rejectPrompt"));
                          if (r) handleReview(art.id, "reject", r);
                        }}
                        disabled={processingId === art.id}
                      >
                        {processingId === art.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" /> {t("action.reject")}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {filter === "REJECTED" && (
                    <div className="text-sm bg-red-50 text-red-700 p-2 rounded-md">
                      <span className="font-bold mr-1">{t("adminArtworks.reasonLabel")}</span>{" "}
                      {art.rejectReason}
                    </div>
                  )}
                  {filter === "APPROVED" && (
                    <div className="flex flex-col gap-2">
                      {art.xiboMediaId ? (
                        <p className="text-center text-green-600 text-sm font-medium flex items-center justify-center">
                          <Check className="w-4 h-4 mr-1" />
                          {t("adminArtworks.publishedLabel")}
                        </p>
                      ) : (
                        <button
                          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-bold shadow-sm disabled:opacity-50"
                          onClick={async () => {
                            if (!confirm(t("adminArtworks.confirmPublish"))) return;
                            setProcessingId(art.id);

                            const res = await fetch(
                              `/api/artworks/${art.id}/publish`,
                              {
                                method: "POST",
                                credentials: "include",
                              }
                            );

                            const text = await res.text();
                            let data: any = {};
                            try {
                              data = JSON.parse(text);
                            } catch {}

                            if (res.ok) fetchArtworks();
                            else alert(data.error ?? text);

                            setProcessingId(null);
                          }}
                          disabled={processingId === art.id}
                        >
                          {processingId === art.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            t("adminArtworks.publishButton")
                          )}
                        </button>
                      )}
                      {art.votingQrUrl && (
                        <a
                          href={art.votingQrUrl}
                          download
                          className="flex items-center gap-3 rounded-lg border border-gray-100 p-2 hover:bg-gray-50 transition-colors"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={art.votingQrUrl}
                            alt={t("adminArtworks.votingQrAlt")}
                            className="w-12 h-12"
                          />
                          <span className="text-xs text-gray-500">
                            {t("adminArtworks.votingQrLabel")}
                            <br />
                            {t("adminArtworks.clickToDownload")}
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {artworks.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">{t("adminArtworks.emptyState")}</p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
