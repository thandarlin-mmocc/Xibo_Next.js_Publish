import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getIdFromRequest(
  request: NextRequest,
  context: { params?: { id?: string } }
) {
  let id = context?.params?.id;
  if (!id) {
    const pathname = new URL(request.url).pathname; // /api/artworks/5/review
    const m = pathname.match(/^\/api\/artworks\/([^/]+)\/review\/?$/);
    if (m) id = m[1];
  }
  return id;
}

export async function PATCH(
  request: NextRequest,
  context: { params?: { id?: string } }
) {
  const id = getIdFromRequest(request, context);
  if (!id) {
    return NextResponse.json(
      {
        error: "Missing id",
        params: context?.params ?? null,
        url: request.url,
      },
      { status: 400 }
    );
  }

  const artworkId = Number(id);
  if (!Number.isFinite(artworkId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await getSession();
  const role = session?.role?.toLowerCase?.() ?? session?.role;
  if (!session || !["admin", "teacher"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({} as any));
    const action = body?.action as "approve" | "reject" | undefined;
    const rejectReason = body?.rejectReason as string | undefined;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Use 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
    });
    if (!artwork)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "reject") {
      if (!rejectReason || rejectReason.trim().length === 0) {
        return NextResponse.json({ error: "Reason required" }, { status: 400 });
      }

      await prisma.artwork.update({
        where: { id: artworkId },
        data: {
          status: "rejected",
          rejectReason: rejectReason.trim(),
          approvedAt: null,
          xiboMediaId: null, // optional: keep this reset on reject
        },
      });

      return NextResponse.json({ success: true });
    }

    // approve (DB only)
    if (artwork.status === "approved") {
      return NextResponse.json(
        { error: "Artwork already approved" },
        { status: 400 }
      );
    }

    await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        status: "approved",
        approvedAt: new Date(),
        rejectReason: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Review failed:", error);
    return NextResponse.json(
      { error: "Review failed", message: error?.message, prisma: error?.code },
      { status: 500 }
    );
  }
}
