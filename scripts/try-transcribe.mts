import { extractAudioFromUrl, transcribeAudio } from "@/lib/media/transcribe-selection";

const [url, startArg = "0", endArg = "60"] = process.argv.slice(2);
if (!url) {
  console.error("usage: pnpm try:transcribe <video-url> [startSec] [endSec]");
  process.exit(1);
}

const range = { start: Number(startArg), end: Number(endArg) };
console.log(`snapshot: ${process.env.FFMPEG_SNAPSHOT_ID ?? "none (installing ffmpeg at boot)"}`);

const t0 = Date.now();
const { audio, timings } = await extractAudioFromUrl(url, range);
console.log(`audio: ${(audio.length / 1024).toFixed(0)} KB`, timings);

if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
  console.log("AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN) not set; skipping transcription.");
} else {
  const t1 = Date.now();
  const { text, language } = await transcribeAudio(audio);
  console.log(`transcribed in ${Date.now() - t1} ms (${language ?? "?"}):\n\n${text}\n`);
}
console.log(`total ${Date.now() - t0} ms`);
