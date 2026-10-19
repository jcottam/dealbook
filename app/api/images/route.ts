import { deletePublicImage, listPublicImages, publicClipsStoreConfigured } from "@/lib/blob";
import { isImagePathname } from "@/lib/images";

export const runtime = "nodejs";

const NOT_CONFIGURED = { error: "Connect the media-utils-clips-public Blob store to enable image uploads." };

export async function GET() {
  if (!publicClipsStoreConfigured()) return Response.json(NOT_CONFIGURED, { status: 501 });
  try {
    return Response.json(await listPublicImages());
  } catch (e) {
    console.error("list images failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't load images. Try again." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!publicClipsStoreConfigured()) return Response.json(NOT_CONFIGURED, { status: 501 });

  let pathname: unknown;
  try {
    ({ pathname } = (await req.json()) as { pathname?: unknown });
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof pathname !== "string" || !isImagePathname(pathname)) {
    return Response.json({ error: "Invalid image path" }, { status: 400 });
  }

  try {
    await deletePublicImage(pathname);
    console.info("image deleted", { pathname });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("delete image failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't delete that image. Try again." }, { status: 500 });
  }
}
