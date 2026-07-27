import { authOptions } from "@/lib/auth";
import { canManageMedia, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { MediaType, UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function mediaTypeFromMime(mimeType: string): MediaType | null {
  if (mimeType.startsWith("image/")) return MediaType.IMAGE;
  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  if (mimeType === "application/pdf") return MediaType.PDF;
  return null;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageMedia(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const where: any = { ...tenantWhere(session.user), deletedAt: null };
  if (type && Object.values(MediaType).includes(type as MediaType)) {
    where.type = type;
  }

  const media = await prisma.mediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(media);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageMedia(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const title = (formData.get("title") as string | null)?.trim();
  const tagsRaw = (formData.get("tags") as string | null) ?? "";

  // Platform ADMIN has no tenant of their own (by design - they manage every
  // tenant), so they must pick which one this media belongs to. Everyone
  // else is always scoped to their own tenant regardless of what's posted -
  // never trust a client-supplied tenantId for a non-admin.
  let tenantId: string;
  if (session.user.role === UserRole.ADMIN) {
    const requestedTenantId = (formData.get("tenantId") as string | null)?.trim();
    if (!requestedTenantId) {
      return NextResponse.json({ error: "tenantId is required for admin uploads" }, { status: 400 });
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

  if (!file || !title) {
    return NextResponse.json({ error: "file and title are required" }, { status: 400 });
  }

  const type = mediaTypeFromMime(file.type);
  if (!type) {
    return NextResponse.json(
      { error: "Unsupported file type - only images, video, and PDF are supported" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
  const storagePath = await saveUploadedFile(buffer, filename, file.type);

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const media = await prisma.mediaAsset.create({
    data: {
      tenantId,
      type,
      title,
      storagePath,
      mimeType: file.type,
      fileSize: buffer.byteLength,
      tags,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(media, { status: 201 });
}
