import { parsePresignedMeta } from "@/lib/clip-url";
import { clipFilename, exportClipFromUrl } from "@/lib/media/export-clip";
import type { ClipPreset } from "@/lib/media/ffmpeg-args";

const [url, startArg = "0", endArg = "60", presetArg = "team"] = process.argv.slice(2);
if (!url) {
  console.error("usage: pnpm try:clip <video-url> [startSec] [endSec] [team|copy]");
  process.exit(1);
}

const range = { start: Number(startArg), end: Number(endArg) };
const preset: ClipPreset = presetArg === "copy" ? "copy" : "team";
const filename = clipFilename(parsePresignedMeta(url)?.filename, range);
console.log(`snapshot: ${process.env.FFMPEG_SNAPSHOT_ID ?? "none (installing ffmpeg at boot)"}`);

const t0 = Date.now();
const { url: clipUrl, pathname, bytes, timings } = await exportClipFromUrl(url, range, preset, filename);
console.log(`${preset}: ${pathname} ${(bytes / 1024 / 1024).toFixed(1)} MB`, timings);
console.log(`total ${Date.now() - t0} ms\n\n${clipUrl}`);
