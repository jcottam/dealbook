import { publicClipsStoreConfigured } from "@/lib/blob";
import { validateForShare } from "@/lib/social-post-preview/checks";
import { normalizePost } from "@/lib/social-post-preview/defaults";
import { newPreviewId } from "@/lib/social-post-preview/id";
import { listPreviewSummaries, savePreviewPost } from "@/lib/social-post-preview/storage";

export const runtime = "nodejs";

function storeMissing() {
  return Response.json(
    { error: "Connect the media-utils-clips-public Blob store to save previews." },
    { status: 501 },
  );
}

export async function GET() {
  if (!publicClipsStoreConfigured()) return storeMissing();
  const items = await listPreviewSummaries();
  return Response.json({ items });
}

export async function POST(req: Request) {
  if (!publicClipsStoreConfigured()) return storeMissing();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });

  const now = new Date().toISOString();
  const post = normalizePost({ ...o, name, id: newPreviewId(), createdAt: now, updatedAt: now });
  const validation = validateForShare(post);
  if (!validation.ok) {
    return Response.json({ error: "Fix issues before sharing.", issues: validation.issues }, { status: 400 });
  }

  const saved = await savePreviewPost(post);
  return Response.json(saved, { status: 201 });
}
