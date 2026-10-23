import { randomUUID } from "node:crypto";
import { CLIP_PREFIX, putPublicClip } from "@/lib/blob";
import { reframeArgs, type TimeRange } from "@/lib/media/ffmpeg-args";
import { probeVideoStream } from "@/lib/media/ffmpeg-probe";
import type { ReframeFocus } from "@/lib/media/reframe-crop";
import { reframeVideoFilter } from "@/lib/media/reframe-crop";
import { createFfmpegSandbox, runFfmpeg, SANDBOX_WORKDIR } from "@/lib/media/ffmpeg-sandbox";
import { clipFilename } from "@/lib/media/export-clip";

const REFRAME_PATH = `${SANDBOX_WORKDIR}/reframe.mp4`;
const SANDBOX_TIMEOUT_MS = 4 * 60_000;

export type ReframeTimings = { sandboxMs: number; ffmpegMs: number; uploadMs: number };

export function reframeFilename(sourceName: string | null | undefined, range: TimeRange): string {
  return clipFilename(sourceName, range).replace(/\.mp4$/i, "_9x16.mp4");
}

export async function exportReframeFromUrl(
  url: string,
  range: TimeRange,
  focus: ReframeFocus,
  filename: string,
) {
  const t0 = Date.now();
  const sandbox = await createFfmpegSandbox({
    allowHosts: [new URL(url).hostname],
    timeoutMs: SANDBOX_TIMEOUT_MS,
    vcpus: 4,
  });
  const t1 = Date.now();
  let video: Buffer | null;
  try {
    const stream = await probeVideoStream(sandbox, url);
    const videoFilter = reframeVideoFilter(stream.width, stream.height, focus);
    await runFfmpeg(sandbox, reframeArgs(url, range, REFRAME_PATH, videoFilter));
    video = await sandbox.readFileToBuffer({ path: REFRAME_PATH });
  } finally {
    await sandbox.stop();
  }
  if (!video?.length) throw new Error("ffmpeg produced no video for this range");
  const t2 = Date.now();

  const blob = await putPublicClip(`${CLIP_PREFIX}${randomUUID()}/${filename}`, video, "video/mp4");

  const timings: ReframeTimings = { sandboxMs: t1 - t0, ffmpegMs: t2 - t1, uploadMs: Date.now() - t2 };
  return { url: blob.url, pathname: blob.pathname, bytes: video.length, timings };
}
