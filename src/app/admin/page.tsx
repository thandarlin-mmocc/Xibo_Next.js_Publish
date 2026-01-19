"use client";

import { useEffect, useState } from "react";
import {
  Check,
  X,
  LogOut,
  Loader2,
  Search,
  LayoutGrid,
  Square,
} from "lucide-react";

type Artwork = {
  id: number;
  title: string;
  nickname: string;
  imagePath: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  xiboMediaId?: number | null;
  school: { name: string };
  createdAt: string;
};

export default function AdminPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
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
    id: number,
    action: "approve" | "reject",
    reason?: string
  ) => {
    if (
      !confirm(`${action === "approve" ? "承認" : "却下"}してよろしいですか？`)
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

    console.log("Review URL:", `/api/artworks/${id}/review`);
    console.log("Status:", res.status);
    console.log("Body:", text);

    if (res.ok) fetchArtworks();
    else alert(data.error ?? text);
    setProcessingId(null);
  };

  const getFilterLabel = (f: string) => {
    switch (f) {
      case "pending":
        return "承認待ち";
      case "approved":
        return "承認済み";
      case "rejected":
        return "却下作品";
      default:
        return f;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Central Admin
              </span>
            </div>
            <div className="flex items-center">
              <span className="mr-4 text-sm text-gray-500 hidden sm:block">
                管理者 (Admin)
              </span>
              <a
                href="/api/auth/logout"
                className="flex items-center text-gray-600 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">ログアウト</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-fit">
            {(["pending", "approved", "rejected"] as const).map((f) => (
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
              title="グリッド表示"
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
              title="大きく表示"
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
                      {art.school.name}
                    </p>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
                    {art.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    作成者: {art.nickname}
                  </p>

                  <div className="mt-auto pt-4 border-t border-gray-100">
                    {filter === "pending" && (
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
                              <Check className="w-4 h-4 mr-1" /> 承認
                            </>
                          )}
                        </button>
                        <button
                          className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center font-bold shadow-sm disabled:opacity-50"
                          onClick={() => {
                            const r = prompt("却下の理由を入力してください:");
                            if (r) handleReview(art.id, "reject", r);
                          }}
                          disabled={processingId === art.id}
                        >
                          {processingId === art.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" /> 却下
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {filter === "rejected" && (
                      <div className="text-sm bg-red-50 text-red-700 p-2 rounded-md">
                        <span className="font-bold mr-1">理由:</span>{" "}
                        {art.rejectReason}
                      </div>
                    )}
                    {filter === "approved" && (
                      <div className="flex flex-col gap-2">
                        {art.xiboMediaId ? (
                          <p className="text-center text-green-600 text-sm font-medium flex items-center justify-center">
                            <Check className="w-4 h-4 mr-1" />
                            承認済み・出稿完了
                          </p>
                        ) : (
                          <button
                            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-bold shadow-sm disabled:opacity-50"
                            onClick={async () => {
                              if (!confirm("Xibo に出稿しますか？")) return;
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

                              console.log(
                                "Publish URL:",
                                `/api/artworks/${art.id}/publish`
                              );
                              console.log("Status:", res.status);
                              console.log("Body:", text);

                              if (res.ok) fetchArtworks();
                              else alert(data.error ?? text);

                              setProcessingId(null);
                            }}
                            disabled={processingId === art.id}
                          >
                            {processingId === art.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Xibo に出稿"
                            )}
                          </button>
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
                <p className="text-lg">該当する作品はありませんでした</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
