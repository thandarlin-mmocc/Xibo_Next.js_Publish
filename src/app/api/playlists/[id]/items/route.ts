import { authOptions } from "@/lib/auth";
import { canManageMedia, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Appends a media asset to the end of the playlist. Reordering is a follow-up, not built in v1. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: playlistId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !canManageMedia(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, ...tenantWhere(session.user), deletedAt: null },
  });
  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const mediaAssetId = body?.mediaAssetId as string | undefined;
  const durationSeconds = typeof body?.durationSeconds === "number" ? body.durationSeconds : 10;
  if (!mediaAssetId) {
    return NextResponse.json({ error: "mediaAssetId is required" }, { status: 400 });
  }

  const media = await prisma.mediaAsset.findFirst({
    where: { id: mediaAssetId, ...tenantWhere(session.user), deletedAt: null },
  });
  if (!media) {
    return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
  }

  // max+1, not count() - count() collides with an existing item's order the
  // moment any earlier item has been removed (e.g. add 2, remove the first,
  // add a new one: count()=1 but the surviving item already has order=1).
  const { _max } = await prisma.playlistItem.aggregate({
    where: { playlistId },
    _max: { order: true },
  });
  const nextOrder = (_max.order ?? -1) + 1;

  const item = await prisma.playlistItem.create({
    data: { playlistId, mediaAssetId, order: nextOrder, durationSeconds },
    include: { mediaAsset: true },
  });

  return NextResponse.json(item, { status: 201 });
}
