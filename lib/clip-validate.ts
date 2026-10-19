import { normalizeLabel } from "@/lib/asset-labels";
import { isAllowedClipUrl } from "@/lib/clip-url";
import type { ClipPreset, TimeRange } from "@/lib/media/ffmpeg-args";
import { MAX_CLIP_SECONDS } from "@/lib/timecode";

export const UPLOAD_PREFIX = "uploads/";

/** Either an allowlisted remote URL or a file the browser already uploaded to Blob under `uploads/`. */
export type SourceRef = { kind: "url"; url: string } | { kind: "upload"; pathname: string; filename: string | null };

export type ValidationError = { error: string; status: number };

/** `label` is normalized; empty when not given. */
export type ClipRequest = { range: TimeRange; preset: ClipPreset; source: SourceRef; label: string };
export type TranscribeRequest = { range: TimeRange; source: SourceRef };

export function isUploadPathname(pathname: string) {
  return (
    pathname.startsWith(UPLOAD_PREFIX) &&
    pathname.length > UPLOAD_PREFIX.length &&
    pathname.length <= 512 &&
    !pathname.includes("..") &&
    !pathname.includes("//") &&
    !pathname.includes("\\")
  );
}

function asObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
}

function parseRange(o: Record<string, unknown>): TimeRange | ValidationError {
  const start = Number(o.start);
  const end = Number(o.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    return { error: "Invalid start/end", status: 400 };
  }
  if (end - start > MAX_CLIP_SECONDS) {
    return { error: `Selection exceeds ${MAX_CLIP_SECONDS} seconds`, status: 400 };
  }
  return { start, end };
}

function parseSource(o: Record<string, unknown>): SourceRef | ValidationError {
  if (typeof o.upload === "string") {
    const pathname = o.upload.trim();
    if (!isUploadPathname(pathname)) return { error: "Invalid upload reference", status: 400 };
    const filename = typeof o.filename === "string" && o.filename.trim() ? o.filename.trim().slice(0, 200) : null;
    return { kind: "upload", pathname, filename };
  }
  const url = typeof o.url === "string" ? o.url.trim() : "";
  if (!url) return { error: "url or upload is required", status: 400 };
  if (!isAllowedClipUrl(url)) return { error: "URL host is not allowlisted", status: 403 };
  return { kind: "url", url };
}

export function parseTranscribeJson(body: unknown): TranscribeRequest | ValidationError {
  const o = asObject(body);
  if (!o) return { error: "Invalid body", status: 400 };
  const range = parseRange(o);
  if ("error" in range) return range;
  const source = parseSource(o);
  if ("error" in source) return source;
  return { range, source };
}

export function parseClipJson(body: unknown): ClipRequest | ValidationError {
  const o = asObject(body);
  if (!o) return { error: "Invalid body", status: 400 };
  const preset = o.preset === "copy" ? "copy" : o.preset === "team" ? "team" : null;
  if (!preset) return { error: "preset must be team or copy", status: 400 };
  if (o.label != null && typeof o.label !== "string") return { error: "label must be a string", status: 400 };
  const base = parseTranscribeJson(o);
  if ("error" in base) return base;
  return { ...base, preset, label: normalizeLabel(o.label) };
}
