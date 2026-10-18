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

/** Strips query strings so presigned signatures never reach logs or API responses. */
export function redactUrls(text: string): string {
  return text.replace(/(https?:\/\/[^\s?'"]+)\?[^\s'"]*?(:?)(?=[\s'"]|$)/g, "$1?…$2");
}
