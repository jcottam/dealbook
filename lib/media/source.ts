import { signedBlobUrl } from "@/lib/blob";
import { parsePresignedMeta } from "@/lib/clip-url";
import type { SourceRef } from "@/lib/clip-validate";

/** Long enough to cover the Sandbox timeout; the link only reads this one upload. */
const UPLOAD_READ_TTL_MS = 10 * 60_000;

/** Resolves a validated source to a URL ffmpeg can range-read, plus a name for the output file. */
export async function resolveSource(source: SourceRef) {
  if (source.kind === "url") {
    return { inputUrl: source.url, sourceName: parsePresignedMeta(source.url)?.filename ?? null, host: new URL(source.url).hostname };
  }
  const inputUrl = await signedBlobUrl(source.pathname, { ttlMs: UPLOAD_READ_TTL_MS });
  return {
    inputUrl,
    sourceName: source.filename ?? source.pathname.split("/").pop() ?? null,
    host: "blob-upload",
  };
}
