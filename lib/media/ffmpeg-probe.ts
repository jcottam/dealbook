import type { Sandbox } from "@vercel/sandbox";
import { FfmpegError } from "@/lib/media/ffmpeg-sandbox";

export type VideoStreamInfo = { width: number; height: number };

/** Display-oriented width/height after 90°/270° rotation metadata. */
export function displayDimensionsFromProbe(
  codedWidth: number,
  codedHeight: number,
  rotationTag?: string,
): VideoStreamInfo {
  const rot = rotationTag != null ? Number(rotationTag) : 0;
  if (rot === 90 || rot === 270) return { width: codedHeight, height: codedWidth };
  return { width: codedWidth, height: codedHeight };
}

export function parseFfprobeStreamJson(stdout: string): VideoStreamInfo {
  let data: { streams?: { width?: number; height?: number; tags?: { rotate?: string } }[] };
  try {
    data = JSON.parse(stdout) as typeof data;
  } catch {
    throw new FfmpegError("Could not parse video metadata");
  }
  const stream = data.streams?.[0];
  const w = stream?.width;
  const h = stream?.height;
  if (!w || !h) throw new FfmpegError("Could not read video dimensions");
  return displayDimensionsFromProbe(w, h, stream?.tags?.rotate);
}

/** Reads the first video stream size (range-reads remote URLs like ffmpeg). */
export async function probeVideoStream(sandbox: Sandbox, inputUrl: string): Promise<VideoStreamInfo> {
  const result = await sandbox.runCommand("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:stream_tags=rotate",
    "-of",
    "json",
    inputUrl,
  ]);
  if (result.exitCode !== 0) {
    const stderr = (await result.stderr()).trim().split("\n").slice(-2).join(" ");
    throw new FfmpegError(stderr || "ffprobe failed");
  }
  return parseFfprobeStreamJson(await result.stdout());
}
