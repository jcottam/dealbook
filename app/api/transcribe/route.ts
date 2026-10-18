import { parseTranscribeJson } from "@/lib/clip-validate";
import { FfmpegError } from "@/lib/media/ffmpeg-sandbox";
import { resolveSource } from "@/lib/media/source";
import { extractAudioFromUrl, transcribeAudio } from "@/lib/media/transcribe-selection";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseTranscribeJson(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Set OPENAI_API_KEY to enable transcription." }, { status: 501 });
  }

  const { range } = parsed;

  try {
    const { inputUrl, host } = await resolveSource(parsed.source);
    const { audio, timings } = await extractAudioFromUrl(inputUrl, range);
    const t0 = Date.now();
    const { text, language } = await transcribeAudio(audio);
    const result = {
      text,
      language,
      durationSec: range.end - range.start,
      audioBytes: audio.length,
      timings: { ...timings, transcribeMs: Date.now() - t0 },
    };
    console.info("transcribe", { host, ...result, text: undefined });
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
