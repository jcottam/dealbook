import { publicClipsStoreConfigured } from "@/lib/blob";
import { validateForShare } from "@/lib/social-post-preview/checks";
import { normalizePost } from "@/lib/social-post-preview/defaults";
import { deletePreviewPost, readPreviewPost, savePreviewPost } from "@/lib/social-post-preview/storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function storeMissing() {
  return Response.json(
    { error: "Connect the media-utils-clips-public Blob store to save previews." },
    { status: 501 },
  );
}

export async function GET(_req: Request, ctx: RouteContext) {
  if (!publicClipsStoreConfigured()) return storeMissing();
  const { id } = await ctx.params;
  const post = await readPreviewPost(id);
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(post);
}

export async function PUT(req: Request, ctx: RouteContext) {
  if (!publicClipsStoreConfigured()) return storeMissing();
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await readPreviewPost(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof o.name === "string" ? o.name.trim() : existing.name;
  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });

  const post = normalizePost({
    ...existing,
    ...o,
    id,
    name,
    createdAt: existing.createdAt,
  });

  const validation = validateForShare(post);
  if (!validation.ok) {
    return Response.json({ error: "Fix issues before sharing.", issues: validation.issues }, { status: 400 });
  }

  const saved = await savePreviewPost(post);
  return Response.json(saved);
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  if (!publicClipsStoreConfigured()) return storeMissing();
  const { id } = await ctx.params;
  const existing = await readPreviewPost(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  await deletePreviewPost(id);
  return Response.json({ ok: true });
}
