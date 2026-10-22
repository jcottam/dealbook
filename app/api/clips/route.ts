import { listPublicClips, publicClipsStoreConfigured } from "@/lib/blob";

export const runtime = "nodejs";

export async function GET() {
  if (!publicClipsStoreConfigured()) {
    return Response.json(
      { error: "Connect the media-utils-clips-public Blob store to list clips." },
      { status: 501 },
    );
  }
  return Response.json(await listPublicClips());
}
