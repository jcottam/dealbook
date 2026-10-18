import { randomUUID } from "node:crypto";
import { blobDownloadUrl, CLIP_PREFIX, putPublicClip } from "@/lib/blob";
import { clipArgs, type ClipPreset, type TimeRange } from "@/lib/media/ffmpeg-args";
import { createFfmpegSandbox, runFfmpeg, SANDBOX_WORKDIR } from "@/lib/media/ffmpeg-sandbox";

const CLIP_PATH = `${SANDBOX_WORKDIR}/clip.mp4`;
const SANDBOX_TIMEOUT_MS = 4 * 60_000;
export type ClipTimings = { sandboxMs: number; ffmpegMs: number; uploadMs: number };

export function clipFilename(sourceName: string | null | undefined, range: TimeRange): string {
  const base = (sourceName ?? "clip")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  const stamp = (n: number) => {
    const s = Math.floor(n);
    return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
  };
  return `${base || "clip"}_${stamp(range.start)}-${stamp(range.end)}.mp4`;
}

export async function exportClipFromUrl(
  url: string,
  range: TimeRange,
  preset: ClipPreset,
  filename: string,
) {
  const t0 = Date.now();
  const sandbox = await createFfmpegSandbox({
    allowHosts: [new URL(url).hostname],
    timeoutMs: SANDBOX_TIMEOUT_MS,
    vcpus: preset === "team" ? 4 : 2,
  });
  const t1 = Date.now();
  let video: Buffer | null;
  try {
    await runFfmpeg(sandbox, clipArgs(url, range, CLIP_PATH, preset));
    video = await sandbox.readFileToBuffer({ path: CLIP_PATH });
  } finally {
    await sandbox.stop();
  }
  if (!video?.length) throw new Error("ffmpeg produced no video for this range");
  const t2 = Date.now();

  // A unique folder keeps the readable filename, which becomes the download name.
  const blob = await putPublicClip(`${CLIP_PREFIX}${randomUUID()}/${filename}`, video, "video/mp4");
  const downloadUrl = blobDownloadUrl(blob.url);

  const timings: ClipTimings = { sandboxMs: t1 - t0, ffmpegMs: t2 - t1, uploadMs: Date.now() - t2 };
  return { downloadUrl, pathname: blob.pathname, bytes: video.length, timings };
}
