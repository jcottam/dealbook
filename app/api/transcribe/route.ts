import { isAllowedClipUrl } from "@/lib/clip-url";
import { MAX_CLIP_SECONDS } from "@/lib/timecode";

export const runtime = "nodejs";

type TranscribeBody = {
  url?: string;
  start?: number;
  end?: number;
};

function validateRange(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
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
    const form = await req.formData();
    const start = Number(form.get("start"));
    const end = Number(form.get("end"));
    const err = validateRange(start, end);
    if (err) return Response.json({ error: err }, { status: 400 });
    return Response.json(
      { error: "Transcription requires TRANSCRIBE_PROVIDER and ffmpeg audio extract (not configured yet)." },
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

  if (!process.env.OPENAI_API_KEY && !process.env.ELEVENLABS_API_KEY) {
    return Response.json(
      { error: "Set OPENAI_API_KEY or ELEVENLABS_API_KEY to enable transcription." },
      { status: 501 },
    );
  }

  return Response.json(
    { error: "Transcription pipeline stub: extract audio for the selected range, then call your STT provider." },
    { status: 501 },
  );
}
