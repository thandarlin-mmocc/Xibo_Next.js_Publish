import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  assignToPlaylist,
  findMediaIdByName,
  getPlaylistById,
  uploadToXiboLibrary,
} from "@/lib/xibo";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
export const runtime = "nodejs";

function toSafeRelative(p: string) {
  return (p ?? "").replace(/^\/+/, "");
}

function extractMediaId(xiboResponse: any): number | null {
  const candidates = [
    xiboResponse?.mediaId,
    xiboResponse?.id,
    xiboResponse?.data?.mediaId,
    xiboResponse?.data?.id,
    xiboResponse?.files?.[0]?.mediaId,
    xiboResponse?.files?.[0]?.id,
    xiboResponse?.data?.files?.[0]?.mediaId,
    xiboResponse?.data?.files?.[0]?.id,
  ];

  for (const c of candidates) {
    const n = typeof c === "string" ? Number(c) : c;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

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
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
    });
    if (!artwork) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (artwork.status !== "approved") {
      return NextResponse.json(
        { error: "Artwork must be approved before publishing" },
        { status: 400 },
      );
    }

    // if (artwork.xiboMediaId) {
    //   return NextResponse.json({
    //     success: true,
    //     alreadyPublished: true,
    //     mediaId: artwork.xiboMediaId,
    //   });
    // }

    const relPath = toSafeRelative(artwork.imagePath);
    const absolutePath = path.join(process.cwd(), "public", relPath);

    try {
      await fs.access(absolutePath);
    } catch {
      return NextResponse.json(
        { error: "File not found on server", absolutePath },
        { status: 400 },
      );
    }

    const playlistId = Number(process.env.XIBO_PLAYLIST_ID);
    if (!Number.isFinite(playlistId)) {
      return NextResponse.json(
        { error: "XIBO_PLAYLIST_ID is missing/invalid" },
        { status: 500 },
      );
    }

    // deterministic media name for lookup/reuse

    const mediaName = `artwork-${
      artwork.id
    }-${Date.now()}-${crypto.randomUUID()}`;

    console.log("Publishing artwork", artwork.id);
    console.log("absolutePath", absolutePath);
    console.log("mediaName", mediaName);

    // upload
    const xiboUpload = await uploadToXiboLibrary(absolutePath, mediaName);
    console.log("xiboUpload", JSON.stringify(xiboUpload, null, 2));
    // If Xibo returned an error per-file, handle it first
    const fileErr = xiboUpload?.files?.[0]?.error;
    if (fileErr) {
      return NextResponse.json(
        { error: "Xibo upload failed", fileErr, mediaName, xiboUpload },
        { status: 400 },
      );
    }

    // normal success case: extract media id from upload response
    const mediaId = extractMediaId(xiboUpload);
    if (!mediaId) {
      return NextResponse.json(
        { error: "Xibo upload succeeded but mediaId not found", xiboUpload },
        { status: 500 },
      );
    }

    try {
      const p = await getPlaylistById(playlistId);
      console.log("[playlist check ok]", p?.playlistId ?? p?.id, p?.name);
    } catch (e: any) {
      console.log(
        "[playlist check failed]",
        e?.response?.status,
        e?.response?.data,
      );
    }

    // assign (with better error output)
    try {
      await assignToPlaylist(playlistId, mediaId, 10);
    } catch (e: any) {
      return NextResponse.json(
        {
          error: "Xibo assign failed",
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data,
        },
        { status: 500 },
      );
    }

    await prisma.artwork.update({
      where: { id: artworkId },
      data: { xiboMediaId: mediaId },
    });

    return NextResponse.json({ success: true, mediaId, playlistId });
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
