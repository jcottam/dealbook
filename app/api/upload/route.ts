import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { isUploadPathname } from "@/lib/clip-validate";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 ** 3;
const TOKEN_TTL_MS = 60 * 60 * 1000;

function privateUploadConfigured() {
  return Boolean(process.env.BLOB_STORE_ID && process.env.BLOB_WEBHOOK_PUBLIC_KEY);
}

/**
 * Issues presigned put URLs so the browser can upload source videos to the private Blob store
 * (OIDC + BLOB_STORE_ID). `handleUpload` cannot sign private-store client tokens when
 * BLOB_READ_WRITE_TOKEN belongs to the public clips/images store — use handleUploadPresigned.
 * No completion callback: Vercel Blob can't reach this route through deployment protection,
 * and clip/transcribe reference the pathname directly.
 */
export async function POST(req: Request) {
  if (!privateUploadConfigured()) {
    return Response.json(
      { error: "Connect the private media-utils Blob store (BLOB_STORE_ID) to enable uploads." },
      { status: 501 },
    );
  }

  let body: HandleUploadPresignedBody;
  try {
    body = (await req.json()) as HandleUploadPresignedBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleUploadPresigned({
      body,
      request: req,
      getSignedToken: async (pathname) => {
        if (!isUploadPathname(pathname)) throw new Error("Invalid upload path");
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ["video/*"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          validUntil: Date.now() + TOKEN_TTL_MS,
        });
        return {
          token,
          urlOptions: {
            allowedContentTypes: ["video/*"],
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            addRandomSuffix: true,
            allowOverwrite: false,
          },
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
