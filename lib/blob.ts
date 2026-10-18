import { issueSignedToken, presignUrl, put } from "@vercel/blob";
import { blobDownloadUrl } from "@/lib/blob-download-url";

export { blobDownloadUrl };

export const CLIP_PREFIX = "clips/";

export function blobStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/** Public `media-utils-clips-public` store (stable clip URLs). Uses `BLOB_READ_WRITE_TOKEN` from that connection. */
export function publicClipsStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function putPublicClip(pathname: string, body: Buffer, contentType: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Connect the media-utils-clips-public Blob store to this project (BLOB_READ_WRITE_TOKEN).",
    );
  }
  return put(pathname, body, { access: "public", contentType, token });
}

/** Short-lived GET link to one private blob. `download` makes the browser save it instead of playing it. */
export async function signedBlobUrl(pathname: string, opts: { ttlMs: number; download?: boolean }) {
  const validUntil = Date.now() + opts.ttlMs;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private" });
  if (!opts.download) return presignedUrl;
  return blobDownloadUrl(presignedUrl);
}
