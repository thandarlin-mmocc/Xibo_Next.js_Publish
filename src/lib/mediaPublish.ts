import { prisma } from "@/lib/prisma";
import { AuditAction, MediaAsset } from "@prisma/client";
import { assignToPlaylist, uploadToXiboLibrary } from "@/lib/xibo";
import { extractMediaId, resolveStoredMediaBuffer, StoredMediaNotFoundError } from "@/lib/xiboPublish";
import { logAudit } from "@/lib/audit";

export { StoredMediaNotFoundError };

/**
 * Uploads a MediaAsset to the Xibo library, reusing its stored xiboMediaId if
 * already uploaded (same idempotency pattern as Artwork.xiboMediaId in
 * xiboPublish.ts) - this is the "publish still goes through Xibo for now"
 * half of the migration plan; the own CMS (MediaAsset/Playlist) is the
 * source of truth, Xibo is just today's rendering destination.
 */
export async function ensureMediaAssetUploaded(media: MediaAsset): Promise<number> {
  if (media.xiboMediaId) return media.xiboMediaId;

  const { buffer, ext } = await resolveStoredMediaBuffer(media.storagePath);
  const mediaName = `media-${media.id}`;
  const xiboUpload = await uploadToXiboLibrary(buffer, mediaName, ext);

  const fileErr = xiboUpload?.files?.[0]?.error;
  if (fileErr) {
    throw new Error(`Xibo upload failed: ${JSON.stringify(fileErr)}`);
  }

  const xiboMediaId = extractMediaId(xiboUpload);
  if (!xiboMediaId) {
    throw new Error(
      `Xibo upload succeeded but mediaId not found in response: ${JSON.stringify(xiboUpload)}`,
    );
  }

  await prisma.mediaAsset.update({
    where: { id: media.id },
    data: { xiboMediaId },
  });

  return xiboMediaId;
}

export type PlaylistPublishItemResult = {
  mediaAssetId: string;
  title: string;
  success: boolean;
  error?: string;
};

/**
 * Publishes every item in a playlist to the tenant's Xibo playlist target -
 * same XIBO_PLAYLIST_ID fallback Artwork publishing uses today (no tenant
 * has configured explicit PublishTarget rows yet, so this matches actual
 * current usage rather than adding unused generality).
 */
export async function publishPlaylist(
  playlistId: string,
  tenantId: string,
): Promise<{ results: PlaylistPublishItemResult[] }> {
  const targetPlaylistId = process.env.XIBO_PLAYLIST_ID;

  const items = await prisma.playlistItem.findMany({
    where: { playlistId },
    include: { mediaAsset: true },
    orderBy: { order: "asc" },
  });

  const results: PlaylistPublishItemResult[] = [];

  for (const item of items) {
    const media = item.mediaAsset;
    try {
      if (!targetPlaylistId) {
        throw new Error("XIBO_PLAYLIST_ID is not configured");
      }
      const xiboMediaId = await ensureMediaAssetUploaded(media);
      await assignToPlaylist(targetPlaylistId, xiboMediaId, item.durationSeconds);

      results.push({ mediaAssetId: media.id, title: media.title, success: true });
      await logAudit({
        action: AuditAction.XIBO_SYNC_SUCCESS,
        tenantId,
        target: `MediaAsset:${media.id}`,
        metadata: { playlistId, xiboMediaId },
      });
    } catch (error: any) {
      const message = error?.message ?? String(error);
      results.push({ mediaAssetId: media.id, title: media.title, success: false, error: message });
      await logAudit({
        action: AuditAction.XIBO_SYNC_ERROR,
        tenantId,
        target: `MediaAsset:${media.id}`,
        metadata: { playlistId, error: message },
      });
    }
  }

  if (results.length > 0 && results.some((r) => r.success)) {
    await prisma.playlist.update({
      where: { id: playlistId },
      data: { publishedAt: new Date() },
    });
  }

  return { results };
}
