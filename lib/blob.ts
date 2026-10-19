import { del, issueSignedToken, list, presignUrl, put } from "@vercel/blob";
import { blobDownloadUrl } from "@/lib/blob-download-url";
import { IMAGE_PREFIX, imageDisplayName, isImagePathname } from "@/lib/images";

export { blobDownloadUrl };

export const CLIP_PREFIX = "clips/";

export function blobStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/** Public `media-utils-clips-public` store (stable clip URLs). Uses `BLOB_READ_WRITE_TOKEN` from that connection. */
export function publicClipsStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Token for the public store. Pass it explicitly: without it the SDK prefers OIDC + `BLOB_STORE_ID`,
 * which is the private uploads store.
 */
export function publicBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Connect the media-utils-clips-public Blob store to this project (BLOB_READ_WRITE_TOKEN).",
    );
  }
  return token;
}

export async function putPublicClip(pathname: string, body: Buffer, contentType: string) {
  return put(pathname, body, { access: "public", contentType, token: publicBlobToken() });
}

export type StoredImage = {
  url: string;
  downloadUrl: string;
  pathname: string;
  name: string;
  size: number;
  uploadedAt: string;
};

/** Newest first. Capped at one list page (1,000 images); `hasMore` says whether older ones were left out. */
export async function listPublicImages(): Promise<{ images: StoredImage[]; hasMore: boolean }> {
  const { blobs, hasMore } = await list({ prefix: IMAGE_PREFIX, limit: 1000, token: publicBlobToken() });
  const images = blobs
    .filter((b) => isImagePathname(b.pathname))
    .map((b) => ({
      url: b.url,
      downloadUrl: b.downloadUrl,
      pathname: b.pathname,
      name: imageDisplayName(b.pathname),
      size: b.size,
      uploadedAt: new Date(b.uploadedAt).toISOString(),
    }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return { images, hasMore };
}

export async function deletePublicImage(pathname: string) {
  if (!isImagePathname(pathname)) throw new Error("Invalid image path");
  await del(pathname, { token: publicBlobToken() });
}

/** Short-lived GET link to one private blob. `download` makes the browser save it instead of playing it. */
export async function signedBlobUrl(pathname: string, opts: { ttlMs: number; download?: boolean }) {
  const validUntil = Date.now() + opts.ttlMs;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private" });
  if (!opts.download) return presignedUrl;
  return blobDownloadUrl(presignedUrl);
}
