import { publicClipsStoreConfigured } from "@/lib/blob";
import { addPreviewComment, listPreviewComments } from "@/lib/social-post-preview/comments";

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
  const comments = await listPreviewComments(id);
  if (comments === null) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ comments });
}

export async function POST(req: Request, ctx: RouteContext) {
  if (!publicClipsStoreConfigured()) return storeMissing();
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return Response.json({ ok: true });
  }

  const result = await addPreviewComment(id, { author: body.author, text: body.text });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ comment: result.comment }, { status: 201 });
}
