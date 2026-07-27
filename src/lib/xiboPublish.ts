import { prisma } from "@/lib/prisma";
import { Artwork, AuditAction, PublishTargetType } from "@prisma/client";
import { assignToPlaylist, uploadToXiboLibrary } from "@/lib/xibo";
import { logAudit } from "@/lib/audit";
import axios from "axios";
import fs from "fs/promises";
import path from "path";

export class StoredMediaNotFoundError extends Error {}

/**
 * Reads a stored file into a buffer, regardless of where it's stored - a
 * local /uploads/... path in local dev (see src/lib/storage.ts's fallback)
 * or an absolute Blob/S3 URL once cloud storage is configured. Xibo only
 * ever gets a buffer either way; it doesn't know or care which backend
 * served it. Shared by Artwork's imagePath and MediaAsset's storagePath
 * (see src/lib/mediaPublish.ts) - one storage-resolution rule for both.
 */
export async function resolveStoredMediaBuffer(
  storagePath: string,
): Promise<{ buffer: Buffer; ext: string }> {
  if (/^https?:\/\//i.test(storagePath)) {
    try {
      const res = await axios.get(storagePath, { responseType: "arraybuffer" });
      const ext = path.extname(new URL(storagePath).pathname) || ".jpg";
      return { buffer: Buffer.from(res.data), ext };
    } catch {
      throw new StoredMediaNotFoundError(
        `Could not fetch stored media from ${storagePath}`,
      );
    }
  }

  const relPath = storagePath.replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), "public", relPath);
  try {
    const buffer = await fs.readFile(absolutePath);
    return { buffer, ext: path.extname(absolutePath) || ".jpg" };
  } catch {
    throw new StoredMediaNotFoundError(`Stored media not found at ${absolutePath}`);
  }
}

type ResolvedTarget = {
  targetType: PublishTargetType;
  targetId: string;
  duration: number;
};

export function extractMediaId(xiboResponse: any): number | null {
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

/**
 * Reads target(s) from PublishTarget. If none are seeded yet for this artwork,
 * falls back to a single synthesized PLAYLIST target from XIBO_PLAYLIST_ID -
 * this preserves today's proven single-playlist behavior for tenants that
 * haven't been configured with explicit PublishTarget rows yet.
 */
export async function resolvePublishTargets(
  artwork: Artwork,
): Promise<ResolvedTarget[]> {
  const rows = await prisma.publishTarget.findMany({
    where: { artworkId: artwork.id },
  });

  if (rows.length > 0) {
    return rows.map((r) => ({
      targetType: r.targetType,
      targetId: r.targetId,
      duration: r.duration,
    }));
  }

  const fallbackPlaylistId = process.env.XIBO_PLAYLIST_ID;
  if (!fallbackPlaylistId) return [];

  return [
    {
      targetType: PublishTargetType.PLAYLIST,
      targetId: fallbackPlaylistId,
      duration: 10,
    },
  ];
}

/**
 * Uploads the artwork's image to the Xibo library, reusing the already-stored
 * mediaId (xiboMediaId) if this artwork was uploaded before - this is a
 * dedup/idempotency guard so re-publishing doesn't create duplicate media.
 */
export async function ensureMediaUploaded(artwork: Artwork): Promise<number> {
  if (artwork.xiboMediaId) return artwork.xiboMediaId;

  const { buffer, ext } = await resolveStoredMediaBuffer(artwork.imagePath ?? "");
  const mediaName = `artwork-${artwork.id}`;
  const xiboUpload = await uploadToXiboLibrary(buffer, mediaName, ext);

  const fileErr = xiboUpload?.files?.[0]?.error;
  if (fileErr) {
    throw new Error(`Xibo upload failed: ${JSON.stringify(fileErr)}`);
  }

  const mediaId = extractMediaId(xiboUpload);
  if (!mediaId) {
    throw new Error(
      `Xibo upload succeeded but mediaId not found in response: ${JSON.stringify(xiboUpload)}`,
    );
  }

  await prisma.artwork.update({
    where: { id: artwork.id },
    data: { xiboMediaId: mediaId },
  });

  return mediaId;
}

async function recordPublishTarget(
  artwork: Artwork,
  target: ResolvedTarget,
) {
  const existing = await prisma.publishTarget.findFirst({
    where: {
      artworkId: artwork.id,
      targetType: target.targetType,
      targetId: target.targetId,
    },
  });

  if (existing) {
    await prisma.publishTarget.update({
      where: { id: existing.id },
      data: { duration: target.duration },
    });
    return;
  }

  await prisma.publishTarget.create({
    data: {
      artworkId: artwork.id,
      tenantId: artwork.tenantId ?? "",
      targetType: target.targetType,
      targetId: target.targetId,
      duration: target.duration,
    },
  });
}

export type PublishTargetResult = {
  targetType: PublishTargetType;
  targetId: string;
  success: boolean;
  error?: string;
};

/**
 * Uploads the artwork (if needed) and assigns it to every resolved
 * PublishTarget for that artwork. PLAYLIST targets use the proven
 * assignToPlaylist path; DISPLAY_GROUP/LAYOUT_REGION_PLAYLIST are wired but
 * gated until their Xibo API shapes are verified against staging (see the
 * Week 1 spike checklist).
 */
export async function publishArtwork(
  artwork: Artwork,
): Promise<{ mediaId: number; targets: PublishTargetResult[] }> {
  const mediaId = await ensureMediaUploaded(artwork);
  const targets = await resolvePublishTargets(artwork);

  const results: PublishTargetResult[] = [];

  for (const target of targets) {
    try {
      switch (target.targetType) {
        case PublishTargetType.PLAYLIST:
          await assignToPlaylist(target.targetId, mediaId, target.duration);
          break;
        case PublishTargetType.DISPLAY_GROUP:
        case PublishTargetType.LAYOUT_REGION_PLAYLIST:
          throw new Error(
            `${target.targetType} publishing not yet spiked against staging Xibo - see Week 1 Phase 10`,
          );
        default:
          throw new Error(`Unknown publish target type: ${target.targetType}`);
      }

      await recordPublishTarget(artwork, target);
      results.push({
        targetType: target.targetType,
        targetId: target.targetId,
        success: true,
      });
      await logAudit({
        action: AuditAction.XIBO_SYNC_SUCCESS,
        tenantId: artwork.tenantId,
        target: `Artwork:${artwork.id}`,
        metadata: { targetType: target.targetType, targetId: target.targetId, mediaId },
      });
    } catch (error: any) {
      const message = error?.message ?? String(error);
      results.push({
        targetType: target.targetType,
        targetId: target.targetId,
        success: false,
        error: message,
      });
      await logAudit({
        action: AuditAction.XIBO_SYNC_ERROR,
        tenantId: artwork.tenantId,
        target: `Artwork:${artwork.id}`,
        metadata: { targetType: target.targetType, targetId: target.targetId, error: message },
      });
    }
  }

  return { mediaId, targets: results };
}
