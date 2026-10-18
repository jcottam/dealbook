export type TimeRange = { start: number; end: number };

const BASE = ["-hide_banner", "-nostdin", "-loglevel", "error"];

function seconds(n: number): string {
  return n.toFixed(3);
}

/**
 * Mono 16 kHz MP3 of the selection — small enough that two minutes stays around 1 MB,
 * well under the 25 MB transcription upload limit.
 * `-ss` before `-i` seeks with HTTP range requests instead of reading from the start.
 */
export function audioExtractArgs(input: string, range: TimeRange, output: string): string[] {
  return [
    ...BASE,
    "-ss",
    seconds(range.start),
    "-i",
    input,
    "-t",
    seconds(range.end - range.start),
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    "-y",
    output,
  ];
}

export type ClipPreset = "team" | "copy";

/**
 * MP4 of the selection.
 * - `team`: re-encode to H.264/AAC, capped at 720p, for small shareable files with frame-accurate cuts.
 * - `copy`: stream copy at source quality; fast, but the cut snaps to the nearest earlier keyframe.
 * `+faststart` moves the index to the front so the clip plays before it fully downloads.
 */
export function clipArgs(input: string, range: TimeRange, output: string, preset: ClipPreset): string[] {
  const codec =
    preset === "team"
      ? [
          "-vf",
          "scale=-2:'min(720,ih)'",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
        ]
      : ["-c", "copy", "-avoid_negative_ts", "make_zero"];
  return [
    ...BASE,
    "-ss",
    seconds(range.start),
    "-i",
    input,
    "-t",
    seconds(range.end - range.start),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    ...codec,
    "-movflags",
    "+faststart",
    "-y",
    output,
  ];
}

/** Strips query strings so presigned signatures never reach logs or API responses. */
export function redactUrls(text: string): string {
  return text.replace(/(https?:\/\/[^\s?'"]+)\?[^\s'"]*?(:?)(?=[\s'"]|$)/g, "$1?…$2");
}
