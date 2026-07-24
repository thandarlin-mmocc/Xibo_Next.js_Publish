import { prisma } from "@/lib/prisma";
import { getVoterSessionId } from "@/lib/voterSession";
import { getDictionary } from "@/i18n/getDictionary";
import { resolveLocaleContext } from "@/i18n/resolveLocale";
import { ArtworkStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VoteButton from "./VoteButton";

const VOTABLE_STATUSES: ArtworkStatus[] = [
  ArtworkStatus.APPROVED,
  ArtworkStatus.PUBLISHED,
];

interface PageProps {
  params: Promise<{ artworkId: string }>;
}

export default async function VotePage({ params }: PageProps) {
  const { artworkId } = await params;

  const artwork = await prisma.artwork.findFirst({
    where: { id: artworkId, status: { in: VOTABLE_STATUSES }, deletedAt: null },
    include: { tenant: true },
  });

  if (!artwork) notFound();

  const { locale } = await resolveLocaleContext(artwork.tenantId ?? undefined);
  const t = getDictionary(locale);

  const voterSession = await getVoterSessionId();
  const [voteCount, existingVote, gallery] = await Promise.all([
    prisma.vote.count({ where: { artworkId: artwork.id } }),
    voterSession
      ? prisma.vote.findFirst({
          where: { artworkId: artwork.id, voterSession },
        })
      : null,
    prisma.artwork.findMany({
      where: {
        tenantId: artwork.tenantId,
        status: { in: VOTABLE_STATUSES },
        deletedAt: null,
        id: { not: artwork.id },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white font-sans">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>
        <p className="text-center text-sm text-gray-500 mb-1">
          {artwork.tenant?.name}
        </p>
        <h1 className="text-center text-2xl font-extrabold text-gray-900 mb-6">
          {t["vote.pageTitle"]}
        </h1>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="aspect-video bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artwork.imagePath}
              alt={artwork.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">{artwork.title}</h2>
            {artwork.studentName && (
              <p className="text-gray-500 text-sm mt-1">{t["vote.byLabel"]} {artwork.studentName}</p>
            )}
            <div className="mt-5">
              <VoteButton
                artworkId={artwork.id}
                initialVoted={!!existingVote}
                initialCount={voteCount}
              />
            </div>
          </div>
        </div>

        {gallery.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t["vote.otherArtworksTitle"]}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {gallery.map((art) => (
                <Link
                  key={art.id}
                  href={`/vote/${art.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={art.imagePath}
                      alt={art.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="p-2 text-xs text-gray-700 truncate">{art.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
