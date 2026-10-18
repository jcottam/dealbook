import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { blobStoreConfigured } from "@/lib/blob";
import { isUploadPathname } from "@/lib/clip-validate";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 ** 3;

/**
 * Issues client tokens so the browser can upload source videos straight to private Blob,
 * bypassing the ~4.5 MB Function body limit. No completion callback: Vercel Blob can't
 * reach this route through deployment protection, and clip/transcribe reference the
 * pathname directly.
 */
export async function POST(req: Request) {
  if (!blobStoreConfigured()) {
    return Response.json({ error: "Connect a Vercel Blob store to enable uploads." }, { status: 501 });
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!isUploadPathname(pathname)) throw new Error("Invalid upload path");
        return {
          allowedContentTypes: ["video/*"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
