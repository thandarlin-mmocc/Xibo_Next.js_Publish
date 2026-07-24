import { authOptions } from "@/lib/auth";
import { canUploadArtwork, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ArtworkStatus } from "@prisma/client";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const whereClause: any = { ...tenantWhere(session.user) };
    if (
      status &&
      Object.values(ArtworkStatus).includes(status as ArtworkStatus)
    ) {
      whereClause.status = status as ArtworkStatus;
    }

    const artworks = await prisma.artwork.findMany({
      where: whereClause,
      include: { tenant: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(artworks);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch artworks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canUploadArtwork(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.tenantId) {
    return NextResponse.json(
      { error: "User has no tenant assigned" },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const studentName = formData.get("nickname") as string;

    if (!file || !title || !studentName) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
    // Vercel's serverless functions have a read-only filesystem (aside from
    // ephemeral /tmp), so uploads go to Vercel Blob rather than local disk -
    // this is the only storage backend change; nothing downstream cares
    // whether imagePath is a local path or a Blob URL.
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType: file.type || undefined,
    });

    const artwork = await prisma.artwork.create({
      data: {
        tenantId: session.user.tenantId,
        title,
        studentName,
        imagePath: blob.url,
        status: ArtworkStatus.PENDING,
      },
    });

    return NextResponse.json(artwork);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
