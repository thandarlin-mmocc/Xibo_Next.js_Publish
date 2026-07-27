import { authOptions } from "@/lib/auth";
import { canManageMedia, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { MediaType } from "@prisma/client";
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
  if (!session.user.tenantId) {
    return NextResponse.json({ error: "User has no tenant assigned" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const title = (formData.get("title") as string | null)?.trim();
  const tagsRaw = (formData.get("tags") as string | null) ?? "";

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
      tenantId: session.user.tenantId,
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
