import type { ClipPreset } from "@/lib/media/ffmpeg-args";
import { MAX_CLIP_SECONDS } from "@/lib/timecode";

export type ClipRequest = {
  start: number;
  end: number;
  preset: ClipPreset;
  url: string;
};

export function parseClipJson(body: unknown): ClipRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const o = body as Record<string, unknown>;
  const start = Number(o.start);
  const end = Number(o.end);
  const preset = o.preset === "copy" ? "copy" : o.preset === "team" ? "team" : null;
  if (!preset) return { error: "preset must be team or copy" };
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    return { error: "Invalid start/end" };
  }
  if (end - start > MAX_CLIP_SECONDS) {
    return { error: `Clip exceeds ${MAX_CLIP_SECONDS} seconds` };
  }
  const url = typeof o.url === "string" ? o.url.trim() : "";
  if (!url) return { error: "url is required" };
  return { start, end, preset, url };
}
