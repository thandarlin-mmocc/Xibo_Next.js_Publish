import { prisma } from "@/lib/prisma";
import { ensureVoterSessionId } from "@/lib/voterSession";
import { ArtworkStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const VOTABLE_STATUSES: ArtworkStatus[] = [
  ArtworkStatus.APPROVED,
  ArtworkStatus.PUBLISHED,
];

function clientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

interface RouteContext {
  params: Promise<{ artworkId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { artworkId } = await context.params;

  const artwork = await prisma.artwork.findFirst({
    where: {
      id: artworkId,
      status: { in: VOTABLE_STATUSES },
      deletedAt: null,
    },
  });
  if (!artwork) {
    return NextResponse.json(
      { error: "Artwork not found or not open for voting" },
      { status: 404 },
    );
  }

  const voterSession = await ensureVoterSessionId();
  const voterIp = clientIp(request);

  try {
    await prisma.vote.create({
      data: {
        artworkId: artwork.id,
        tenantId: artwork.tenantId,
        voterSession,
        voterIp,
      },
    });
  } catch (error: any) {
    // P2002 = unique constraint violation on (artworkId, voterSession) -
    // this browser already voted for this artwork.
    if (error?.code === "P2002") {
      const voteCount = await prisma.vote.count({
        where: { artworkId: artwork.id },
      });
      return NextResponse.json({ alreadyVoted: true, voteCount }, { status: 409 });
    }
    console.error("Vote failed:", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }

  const voteCount = await prisma.vote.count({
    where: { artworkId: artwork.id },
  });
  return NextResponse.json({ success: true, voteCount });
}
