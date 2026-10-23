import { blobStoreConfigured, publicClipsStoreConfigured, setAssetLabel } from "@/lib/blob";
import { parseReframeJson } from "@/lib/clip-validate";
import { exportReframeFromUrl, reframeFilename } from "@/lib/media/export-reframe";
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

  const parsed = parseReframeJson(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  if (!blobStoreConfigured()) {
    return Response.json({ error: "Connect a Vercel Blob store to enable clip export." }, { status: 501 });
  }
  if (!publicClipsStoreConfigured()) {
    return Response.json(
      { error: "Connect the media-utils-clips-public Blob store to enable public clip URLs." },
      { status: 501 },
    );
  }

  const { range, focus } = parsed;

  try {
    const { inputUrl, sourceName, host } = await resolveSource(parsed.source);
    const filename = reframeFilename(sourceName, range);
    const result = await exportReframeFromUrl(inputUrl, range, focus, filename);
    let label: string | null = null;
    if (parsed.label) {
      try {
        label = await setAssetLabel(result.pathname, parsed.label);
      } catch (e) {
        console.error("reframe label failed", e instanceof Error ? e.message : e);
      }
    }
    console.info("reframe", {
      host,
      durationSec: range.end - range.start,
      focus,
      pathname: result.pathname,
      bytes: result.bytes,
      ...result.timings,
    });
    return Response.json({
      url: result.url,
      pathname: result.pathname,
      label,
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
    const message = e instanceof Error ? e.message : "Reframe export failed.";
    console.error("reframe failed", message);
    const client =
      message.includes("Vercel Blob") || message.includes("Blob store") ? message : "Reframe export failed. Try again.";
    return Response.json({ error: client }, { status: 500 });
  }
}
