import { authOptions } from "@/lib/auth";
import { canReviewArtwork, tenantWhere } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { generateVotingQrCode } from "@/lib/voteQr";
import { publishArtwork, resolveArtworkImagePath } from "@/lib/xiboPublish";
import { ArtworkStatus, AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>; // Ensure `params` is a Promise
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  // Await the params before using it
  const params = await context.params;
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      {
        error: "Missing id",
        params: context?.params ?? null,
        url: request.url,
      },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session || !canReviewArtwork(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}) as any);
    const action = body?.action as "approve" | "reject" | undefined;
    const rejectReason = body?.rejectReason as string | undefined;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Use 'approve' or 'reject'." },
        { status: 400 },
      );
    }

    // Scoped to the caller's tenant - a cross-tenant id resolves to null (404),
    // not just "not found because wrong id."
    const artwork = await prisma.artwork.findFirst({
      where: { id, ...tenantWhere(session.user) },
    });
    if (!artwork)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "reject") {
      if (!rejectReason || rejectReason.trim().length === 0) {
        return NextResponse.json({ error: "Reason required" }, { status: 400 });
      }

      await prisma.artwork.update({
        where: { id },
        data: {
          status: ArtworkStatus.REJECTED,
          rejectReason: rejectReason.trim(),
          approvedAt: null,
          xiboMediaId: null, // optional: keep this reset on reject
        },
      });

      await logAudit({
        action: AuditAction.ARTWORK_REJECT,
        actorId: session.user.id,
        tenantId: artwork.tenantId,
        target: `Artwork:${artwork.id}`,
        metadata: { rejectReason: rejectReason.trim() },
        ...requestMeta(request),
      });

      return NextResponse.json({ success: true });
    }

    // approve (DB only)
    if (artwork.status === ArtworkStatus.APPROVED) {
      return NextResponse.json(
        { error: "Artwork already approved" },
        { status: 400 },
      );
    }

    // Generated once per artwork on approval, per the schema's intent for
    // votingQrUrl. Best-effort - a QR failure shouldn't block the approval.
    let votingQrUrl: string | undefined;
    try {
      votingQrUrl = artwork.votingQrUrl ?? (await generateVotingQrCode(artwork.id));
    } catch (qrError) {
      console.error("Voting QR generation failed:", qrError);
    }

    await prisma.artwork.update({
      where: { id },
      data: {
        status: ArtworkStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: session.user.id,
        rejectReason: null,
        ...(votingQrUrl ? { votingQrUrl } : {}),
      },
    });

    await logAudit({
      action: AuditAction.ARTWORK_APPROVE,
      actorId: session.user.id,
      tenantId: artwork.tenantId,
      target: `Artwork:${artwork.id}`,
      ...requestMeta(request),
    });

    // Best-effort auto-sync to Xibo right after approval, so the common case
    // needs no second manual step. XIBO_SYNC_SUCCESS/ERROR is already logged
    // inside publishArtwork(); a failure here does not undo the approval -
    // the "Xibo に出稿" button in the admin UI stays available as a manual
    // retry (ensureMediaUploaded is idempotent via xiboMediaId).
    let autoPublish: { mediaId: number; targets: unknown[] } | { error: string } | null = null;
    try {
      const absolutePath = await resolveArtworkImagePath(artwork);
      autoPublish = await publishArtwork(artwork, absolutePath);
    } catch (publishError: any) {
      autoPublish = { error: publishError?.message ?? String(publishError) };
    }

    return NextResponse.json({ success: true, autoPublish });
  } catch (error: any) {
    console.error("Review failed:", error);
    return NextResponse.json(
      { error: "Review failed", message: error?.message, prisma: error?.code },
      { status: 500 },
    );
  }
}
