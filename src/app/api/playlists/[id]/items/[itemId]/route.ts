import { authOptions } from "@/lib/auth";
import { canManageMedia, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: playlistId, itemId } = await context.params;
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

  await prisma.playlistItem.deleteMany({ where: { id: itemId, playlistId } });
  return NextResponse.json({ success: true });
}
