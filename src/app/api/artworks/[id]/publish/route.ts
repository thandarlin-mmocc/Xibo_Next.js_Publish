import { authOptions } from "@/lib/auth";
import { canPublishArtwork, tenantWhere } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { ArtworkStatus, AuditAction } from "@prisma/client";
import { ArtworkImageNotFoundError, publishArtwork } from "@/lib/xiboPublish";
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

    const { mediaId, targets } = await publishArtwork(artwork);

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
    if (error instanceof ArtworkImageNotFoundError) {
      return NextResponse.json(
        { error: "Image not found on server", imagePath: error.message },
        { status: 400 },
      );
    }

    // Log the full upstream detail server-side only - never relay a raw
    // Xibo/axios error body to the client, since it's unverified what an
    // upstream error payload might contain.
    const referenceId = `pub_${Date.now().toString(36)}`;
    console.error(`Publish failed [${referenceId}]:`, error?.message, {
      axiosStatus: error?.response?.status,
      axiosData: error?.response?.data,
    });
    return NextResponse.json(
      { error: "Publish failed", referenceId },
      { status: 500 },
    );
  }
}
