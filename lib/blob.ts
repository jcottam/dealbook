import { issueSignedToken, presignUrl } from "@vercel/blob";

export const CLIP_PREFIX = "clips/";

export function blobStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/** Short-lived GET link to one private blob. `download` makes the browser save it instead of playing it. */
export async function signedBlobUrl(pathname: string, opts: { ttlMs: number; download?: boolean }) {
  const validUntil = Date.now() + opts.ttlMs;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private" });
  if (!opts.download) return presignedUrl;
  const u = new URL(presignedUrl);
  u.searchParams.set("download", "1");
  return u.toString();
}
