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
    where: { id: playlistId, ...tenantWhere(session.user) },
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
    where: { id: mediaAssetId, ...tenantWhere(session.user) },
  });
  if (!media) {
    return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
  }

  const count = await prisma.playlistItem.count({ where: { playlistId } });
  const item = await prisma.playlistItem.create({
    data: { playlistId, mediaAssetId, order: count, durationSeconds },
    include: { mediaAsset: true },
  });

  return NextResponse.json(item, { status: 201 });
}
