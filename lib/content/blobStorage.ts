import { put } from "@vercel/blob";

/**
 * Video (and any large binary) needs real file storage — Upstash Redis's
 * REST API caps value sizes well below what a video file needs, so it's
 * only ever used for small JSON/image payloads elsewhere in this codebase.
 * Vercel Blob is the natural fit given everything else here is already
 * Vercel-native (cron, hosting).
 *
 * Requires BLOB_READ_WRITE_TOKEN — add a Blob store from the Vercel
 * project's Storage tab, which sets this automatically.
 */
export async function uploadToBlob(bytes: Buffer, filename: string, contentType: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set — add a Blob store from the Vercel project's Storage tab");
  }
  const blob = await put(filename, bytes, { access: "public", contentType, addRandomSuffix: true });
  return blob.url;
}
