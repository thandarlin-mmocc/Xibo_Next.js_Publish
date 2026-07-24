import { authOptions } from "@/lib/auth";
import { canPublishArtwork, tenantWhere } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { ArtworkStatus, AuditAction } from "@prisma/client";
import { publishArtwork, resolveArtworkImagePath } from "@/lib/xiboPublish";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

function getIdFromRequest(request: NextRequest, params: { id: string }) {
  let id = params?.id;
  if (!id) {
    const pathname = new URL(request.url).pathname; // /api/artworks/5/publish
    const m = pathname.match(/^\/api\/artworks\/([^/]+)\/publish\/?$/);
    if (m) id = m[1];
  }
  return id;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}
export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const id = getIdFromRequest(request, params);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session || !canPublishArtwork(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Scoped to the caller's tenant - a cross-tenant id resolves to null (404).
    const artwork = await prisma.artwork.findFirst({
      where: { id, ...tenantWhere(session.user) },
    });
    if (!artwork) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (artwork.status !== ArtworkStatus.APPROVED) {
      return NextResponse.json(
        { error: "Artwork must be approved before publishing" },
        { status: 400 },
      );
    }

    let absolutePath: string;
    try {
      absolutePath = await resolveArtworkImagePath(artwork);
    } catch {
      return NextResponse.json(
        { error: "File not found on server", imagePath: artwork.imagePath },
        { status: 400 },
      );
    }

    const { mediaId, targets } = await publishArtwork(artwork, absolutePath);

    const anySucceeded = targets.some((t) => t.success);
    if (!anySucceeded) {
      return NextResponse.json(
        { error: "Xibo publish failed for all targets", mediaId, targets },
        { status: 500 },
      );
    }

    await logAudit({
      action: AuditAction.ARTWORK_PUBLISH,
      actorId: session.user.id,
      tenantId: artwork.tenantId,
      target: `Artwork:${artwork.id}`,
      metadata: { mediaId, targets },
      ...requestMeta(request),
    });

    return NextResponse.json({ success: true, mediaId, targets });
  } catch (error: any) {
    console.error("Publish failed:", error);
    return NextResponse.json(
      {
        error: "Publish failed",
        message: error?.message,
        axiosStatus: error?.response?.status,
        axiosData: error?.response?.data,
      },
      { status: 500 },
    );
  }
}
