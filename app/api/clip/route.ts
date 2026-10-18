import { isAllowedClipUrl, parsePresignedMeta } from "@/lib/clip-url";
import { parseClipJson } from "@/lib/clip-validate";
import { clipFilename, exportClipFromUrl } from "@/lib/media/export-clip";
import { FfmpegError } from "@/lib/media/ffmpeg-sandbox";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Clipping uploaded files isn't available yet. Paste a video URL instead." },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseClipJson(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { url } = parsed;
  if (!isAllowedClipUrl(url)) {
    return Response.json({ error: "URL host is not allowlisted for clipping" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return Response.json({ error: "Connect a Vercel Blob store to enable clip export." }, { status: 501 });
  }

  const range = { start: parsed.start, end: parsed.end };
  const filename = clipFilename(parsePresignedMeta(url)?.filename, range);

  try {
    const result = await exportClipFromUrl(url, range, parsed.preset, filename);
    console.info("clip", {
      host: new URL(url).hostname,
      preset: parsed.preset,
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
