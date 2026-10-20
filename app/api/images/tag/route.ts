import { publicClipsStoreConfigured, setImageTag } from "@/lib/blob";
import { isImagePathname } from "@/lib/images";

export const runtime = "nodejs";

/** Sets the tag (e.g. "Post 1") on an image (`images/<id>/…`). An empty tag clears it. */
export async function PUT(req: Request) {
  if (!publicClipsStoreConfigured()) {
    return Response.json(
      { error: "Connect the media-utils-clips-public Blob store to save tags." },
      { status: 501 },
    );
  }

  let body: { pathname?: unknown; tag?: unknown };
  try {
    body = ((await req.json()) ?? {}) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.pathname !== "string" || !isImagePathname(body.pathname)) {
    return Response.json({ error: "Invalid image path" }, { status: 400 });
  }
  if (body.tag != null && typeof body.tag !== "string") {
    return Response.json({ error: "tag must be a string" }, { status: 400 });
  }

  try {
    const tag = await setImageTag(body.pathname, body.tag ?? "");
    return Response.json({ tag });
  } catch (e) {
    console.error("set tag failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't save the tag. Try again." }, { status: 500 });
  }
}
