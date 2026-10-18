import { transcribe } from "ai";
import { transcribeGatewayModelId } from "@/lib/ai-gateway";
import { audioExtractArgs, type TimeRange } from "@/lib/media/ffmpeg-args";
import { createFfmpegSandbox, runFfmpeg, SANDBOX_WORKDIR } from "@/lib/media/ffmpeg-sandbox";

const AUDIO_PATH = `${SANDBOX_WORKDIR}/selection.mp3`;
const SANDBOX_TIMEOUT_MS = 4 * 60_000;

export type ExtractTimings = { sandboxMs: number; ffmpegMs: number };

export async function extractAudioFromUrl(url: string, range: TimeRange) {
  const t0 = Date.now();
  const sandbox = await createFfmpegSandbox({
    allowHosts: [new URL(url).hostname],
    timeoutMs: SANDBOX_TIMEOUT_MS,
  });
  const t1 = Date.now();
  try {
    await runFfmpeg(sandbox, audioExtractArgs(url, range, AUDIO_PATH));
    const audio = await sandbox.readFileToBuffer({ path: AUDIO_PATH });
    if (!audio?.length) throw new Error("ffmpeg produced no audio for this range");
    const timings: ExtractTimings = { sandboxMs: t1 - t0, ffmpegMs: Date.now() - t1 };
    return { audio, timings };
  } finally {
    await sandbox.stop();
  }
}

export async function transcribeAudio(audio: Uint8Array) {
  const result = await transcribe({ model: transcribeGatewayModelId(), audio });
  return { text: result.text, language: result.language ?? null };
}
