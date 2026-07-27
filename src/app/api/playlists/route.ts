import { authOptions } from "@/lib/auth";
import { canManageMedia, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageMedia(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlists = await prisma.playlist.findMany({
    where: { ...tenantWhere(session.user), deletedAt: null },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { mediaAsset: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(playlists);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageMedia(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const name = (body?.name as string | undefined)?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Platform ADMIN has no tenant of their own, so they must pick one - same
  // pattern as media upload. Never trust a client-supplied tenantId for a
  // non-admin; they're always scoped to their own tenant.
  let tenantId: string;
  if (session.user.role === UserRole.ADMIN) {
    const requestedTenantId = (body?.tenantId as string | undefined)?.trim();
    if (!requestedTenantId) {
      return NextResponse.json({ error: "tenantId is required for admin-created playlists" }, { status: 400 });
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: requestedTenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }
    tenantId = requestedTenantId;
  } else {
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "User has no tenant assigned" }, { status: 400 });
    }
    tenantId = session.user.tenantId;
  }

  const playlist = await prisma.playlist.create({
    data: {
      tenantId,
      name,
      createdById: session.user.id,
    },
    include: { items: { include: { mediaAsset: true } } },
  });

  return NextResponse.json(playlist, { status: 201 });
}
