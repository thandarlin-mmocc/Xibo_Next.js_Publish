"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { Heart, Loader2 } from "lucide-react";
import { useState } from "react";

export default function VoteButton({
  artworkId,
  initialVoted,
  initialCount,
}: {
  artworkId: string;
  initialVoted: boolean;
  initialCount: number;
}) {
  const { t, formatNumber } = useLocale();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVote = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/vote/${artworkId}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setVoted(true);
        setCount(data.voteCount ?? count + 1);
      } else if (res.status === 409) {
        setVoted(true);
        setCount(data.voteCount ?? count);
      } else {
        setError(data.error ?? t("vote.voteFailed"));
      }
    } catch {
      setError(t("vote.voteFailed"));
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleVote}
        disabled={voted || loading}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-md transition-all ${
          voted
            ? "bg-pink-50 text-pink-500 border border-pink-200 cursor-default"
            : "bg-pink-500 text-white hover:bg-pink-600 hover:shadow-lg disabled:opacity-60"
        }`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Heart className={`w-5 h-5 ${voted ? "fill-pink-500" : ""}`} />
        )}
        {voted ? t("vote.thankedLabel") : t("vote.voteButtonLabel")}
      </button>
      <p className="text-sm text-gray-500">{formatNumber(count)} {t("vote.voteCountSuffix")}</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
