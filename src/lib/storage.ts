import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Saves an uploaded file and returns the URL/path to store on the record.
 *
 * Local dev (no BLOB_READ_WRITE_TOKEN configured) writes to public/uploads,
 * so `npm run dev` works with zero cloud setup. Once BLOB_READ_WRITE_TOKEN
 * is set (Vercel dashboard -> Storage -> Blob), uploads go to Vercel Blob
 * instead - required for any serverless deploy, since only /tmp is writable
 * there and it's wiped between invocations. Swap in an S3 branch here when
 * moving to AWS; callers never need to change.
 */
export async function saveUploadedFile(
  buffer: Buffer,
  filename: string,
  contentType?: string,
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }

  const uploadDir = path.join(process.cwd(), "public/uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}
