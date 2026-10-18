import { isAllowedClipUrl } from "@/lib/clip-url";
import { FfmpegError } from "@/lib/media/ffmpeg-sandbox";
import { extractAudioFromUrl, transcribeAudio } from "@/lib/media/transcribe-selection";
import { MAX_CLIP_SECONDS } from "@/lib/timecode";

export const runtime = "nodejs";
export const maxDuration = 300;

type TranscribeBody = {
  url?: string;
  start?: number;
  end?: number;
};

function validateRange(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    return "Invalid start/end";
  }
  if (end - start > MAX_CLIP_SECONDS) {
    return `Selection exceeds ${MAX_CLIP_SECONDS} seconds`;
  }
  return null;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Transcribing uploaded files isn't available yet. Paste a video URL instead." },
      { status: 501 },
    );
  }

  let body: TranscribeBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const start = Number(body.start);
  const end = Number(body.end);
  const err = validateRange(start, end);
  if (err) return Response.json({ error: err }, { status: 400 });

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return Response.json({ error: "url is required" }, { status: 400 });
  if (!isAllowedClipUrl(url)) {
    return Response.json({ error: "URL host is not allowlisted" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Set OPENAI_API_KEY to enable transcription." }, { status: 501 });
  }

  try {
    const { audio, timings } = await extractAudioFromUrl(url, { start, end });
    const t0 = Date.now();
    const { text, language } = await transcribeAudio(audio);
    const result = {
      text,
      language,
      durationSec: end - start,
      audioBytes: audio.length,
      timings: { ...timings, transcribeMs: Date.now() - t0 },
    };
    console.info("transcribe", { host: new URL(url).hostname, ...result, text: undefined });
    return Response.json(result);
  } catch (e) {
    if (e instanceof FfmpegError) {
      return Response.json(
        { error: `Couldn't read that part of the video: ${e.message}` },
        { status: 422 },
      );
    }
    console.error("transcribe failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Transcription failed. Try again." }, { status: 500 });
  }
}
