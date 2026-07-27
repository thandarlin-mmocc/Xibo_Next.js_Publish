import { authOptions } from "@/lib/auth";
import { canManageMedia, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !canManageMedia(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await prisma.playlist.findFirst({
    where: { id, ...tenantWhere(session.user) },
  });
  if (!playlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.playlist.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
