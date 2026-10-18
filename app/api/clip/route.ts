import { blobStoreConfigured } from "@/lib/blob";
import { parseClipJson } from "@/lib/clip-validate";
import { clipFilename, exportClipFromUrl } from "@/lib/media/export-clip";
import { FfmpegError } from "@/lib/media/ffmpeg-sandbox";
import { resolveSource } from "@/lib/media/source";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseClipJson(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  if (!blobStoreConfigured()) {
    return Response.json({ error: "Connect a Vercel Blob store to enable clip export." }, { status: 501 });
  }

  const { range, preset } = parsed;

  try {
    const { inputUrl, sourceName, host } = await resolveSource(parsed.source);
    const filename = clipFilename(sourceName, range);
    const result = await exportClipFromUrl(inputUrl, range, preset, filename);
    console.info("clip", {
      host,
      preset,
      durationSec: range.end - range.start,
      pathname: result.pathname,
      bytes: result.bytes,
      ...result.timings,
    });
    return Response.json({
      downloadUrl: result.downloadUrl,
      filename,
      bytes: result.bytes,
      timings: result.timings,
    });
  } catch (e) {
    if (e instanceof FfmpegError) {
      return Response.json(
        { error: `Couldn't read that part of the video: ${e.message}` },
        { status: 422 },
      );
    }
    console.error("clip failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Clip export failed. Try again." }, { status: 500 });
  }
}
