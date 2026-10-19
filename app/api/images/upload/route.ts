import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { publicBlobToken, publicClipsStoreConfigured } from "@/lib/blob";
import { imageUploadTokenOptions } from "@/lib/images";

export const runtime = "nodejs";

/**
 * Issues client tokens so the browser uploads images straight to the public Blob store under `images/`.
 * No completion callback, for the same reason as `/api/upload`: Blob can't reach it through deployment protection.
 */
export async function POST(req: Request) {
  if (!publicClipsStoreConfigured()) {
    return Response.json(
      { error: "Connect the media-utils-clips-public Blob store to enable image uploads." },
      { status: 501 },
    );
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
      token: publicBlobToken(),
      onBeforeGenerateToken: async (pathname) => imageUploadTokenOptions(pathname),
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
