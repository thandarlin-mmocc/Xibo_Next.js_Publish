import { authOptions } from "@/lib/auth";
import { canPublishMedia, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { publishPlaylist, StoredMediaNotFoundError } from "@/lib/mediaPublish";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Publishes a playlist through the existing, proven Xibo upload/assign path -
 * the own CMS (this playlist) is the source of truth, Xibo is still today's
 * rendering destination until a native player runtime exists to remove it.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: playlistId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !canPublishMedia(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, ...tenantWhere(session.user) },
  });
  if (!playlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { results } = await publishPlaylist(playlistId, playlist.tenantId);
    const anySucceeded = results.some((r) => r.success);
    if (results.length === 0) {
      return NextResponse.json({ error: "Playlist has no items" }, { status: 400 });
    }
    if (!anySucceeded) {
      return NextResponse.json({ error: "Publish failed for all items", results }, { status: 500 });
    }
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    if (error instanceof StoredMediaNotFoundError) {
      return NextResponse.json({ error: "One or more media files could not be found" }, { status: 400 });
    }
    const referenceId = `pub_${Date.now().toString(36)}`;
    console.error(`Playlist publish failed [${referenceId}]:`, error?.message);
    return NextResponse.json({ error: "Publish failed", referenceId }, { status: 500 });
  }
}
