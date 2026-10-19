import { isLabelableAsset, publicClipsStoreConfigured, setAssetLabel } from "@/lib/blob";

export const runtime = "nodejs";

/** Sets the label on an image (`images/<id>/…`) or exported clip (`clips/<uuid>/…`). */
export async function PUT(req: Request) {
  if (!publicClipsStoreConfigured()) {
    return Response.json(
      { error: "Connect the media-utils-clips-public Blob store to save labels." },
      { status: 501 },
    );
  }

  let body: { pathname?: unknown; label?: unknown };
  try {
    body = ((await req.json()) ?? {}) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.pathname !== "string" || !isLabelableAsset(body.pathname)) {
    return Response.json({ error: "Invalid asset path" }, { status: 400 });
  }
  if (body.label != null && typeof body.label !== "string") {
    return Response.json({ error: "label must be a string" }, { status: 400 });
  }

  try {
    const label = await setAssetLabel(body.pathname, body.label ?? "");
    return Response.json({ label });
  } catch (e) {
    console.error("set label failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't save the label. Try again." }, { status: 500 });
  }
}
