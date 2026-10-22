import { del, list, put } from "@vercel/blob";
import { publicBlobToken } from "@/lib/blob";
import { normalizePost, toPublicPost } from "@/lib/social-post-preview/defaults";
import { inferInstagramPostType } from "@/lib/social-post-preview/infer-type";
import type { PreviewPostSummary, PublicSocialPost, SocialPost } from "@/lib/social-post-preview/types";

export const PREVIEW_PREFIX = "previews/";
const POST_FILE_RE = /^post-(\d+)\.json$/;
const LIST_PAGE_LIMIT = 1000;
const MAX_LIST_PAGES = 20;

function previewFolder(id: string) {
  return `${PREVIEW_PREFIX}${id}/`;
}

function postFilename(now = Date.now()) {
  return `post-${now}.json`;
}

function parsePostTimestamp(pathname: string): number {
  const name = pathname.slice(pathname.lastIndexOf("/") + 1);
  const m = POST_FILE_RE.exec(name);
  return m ? Number(m[1]) : 0;
}

async function listFolder(prefix: string) {
  const token = publicBlobToken();
  const blobs: { pathname: string; url: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const result = await list({ prefix, limit: LIST_PAGE_LIMIT, cursor, token });
    for (const b of result.blobs) {
      blobs.push({ pathname: b.pathname, url: b.url, uploadedAt: b.uploadedAt });
    }
    if (!result.hasMore) break;
    cursor = result.cursor;
  }
  return blobs;
}

async function readNewestPostJson(blobs: { pathname: string; url: string }[]): Promise<SocialPost | null> {
  const posts = blobs.filter((b) => POST_FILE_RE.test(b.pathname.slice(b.pathname.lastIndexOf("/") + 1)));
  if (!posts.length) return null;
  posts.sort((a, b) => parsePostTimestamp(b.pathname) - parsePostTimestamp(a.pathname));
  const newest = posts[0];
  const res = await fetch(newest.url, { cache: "no-store" });
  if (!res.ok) return null;
  return normalizePost(await res.json());
}

export async function savePreviewPost(post: SocialPost): Promise<SocialPost> {
  const token = publicBlobToken();
  const folder = previewFolder(post.id);
  const now = Date.now();
  const updated: SocialPost = { ...post, updatedAt: new Date(now).toISOString() };
  const pathname = `${folder}${postFilename(now)}`;
  const body = JSON.stringify(updated);
  await put(pathname, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
    token,
  });

  const existing = await listFolder(folder);
  const stale = existing
    .filter((b) => b.pathname !== pathname && POST_FILE_RE.test(b.pathname.slice(b.pathname.lastIndexOf("/") + 1)))
    .map((b) => b.url);
  if (stale.length) await del(stale, { token });

  return updated;
}

export async function readPreviewPost(id: string): Promise<SocialPost | null> {
  if (!id || id.includes("/") || id.includes("..")) return null;
  const blobs = await listFolder(previewFolder(id));
  return readNewestPostJson(blobs);
}

export async function readPublicPreviewPost(id: string): Promise<PublicSocialPost | null> {
  const post = await readPreviewPost(id);
  return post ? toPublicPost(post) : null;
}

export async function deletePreviewPost(id: string): Promise<void> {
  if (!id || id.includes("/") || id.includes("..")) throw new Error("Invalid preview id");
  const token = publicBlobToken();
  const blobs = await listFolder(previewFolder(id));
  const urls = blobs.map((b) => b.url);
  if (urls.length) await del(urls, { token });
}

export async function listPreviewSummaries(): Promise<PreviewPostSummary[]> {
  const token = publicBlobToken();
  const blobs: { pathname: string; url: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  for (let page = 0; page < MAX_LIST_PAGES && hasMore; page++) {
    const result = await list({ prefix: PREVIEW_PREFIX, limit: LIST_PAGE_LIMIT, cursor, token });
    for (const b of result.blobs) {
      blobs.push({ pathname: b.pathname, url: b.url, uploadedAt: b.uploadedAt });
    }
    hasMore = result.hasMore;
    cursor = result.cursor;
  }

  const byId = new Map<string, { pathname: string; url: string; ts: number }[]>();
  for (const b of blobs) {
    const rest = b.pathname.slice(PREVIEW_PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) continue;
    const id = rest.slice(0, slash);
    const file = rest.slice(slash + 1);
    if (!POST_FILE_RE.test(file)) continue;
    const arr = byId.get(id) ?? [];
    arr.push({ pathname: b.pathname, url: b.url, ts: parsePostTimestamp(b.pathname) });
    byId.set(id, arr);
  }

  const summaries: PreviewPostSummary[] = [];
  for (const [id, files] of byId) {
    files.sort((a, b) => b.ts - a.ts);
    const post = await readNewestPostJson(files.map((f) => ({ pathname: f.pathname, url: f.url })));
    if (!post) continue;
    summaries.push({
      id,
      name: post.name,
      platforms: post.platforms,
      instagramType: inferInstagramPostType(post.media),
      ...previewThumbnail(post),
      updatedAt: post.updatedAt,
    });
  }

  summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return summaries;
}

/** Share-history thumbnail: first media item, at the Instagram cover frame for single-video posts. */
export function previewThumbnail(
  post: Pick<SocialPost, "media" | "instagram">,
): Pick<PreviewPostSummary, "thumbnailUrl" | "thumbnailKind" | "thumbnailSeconds"> {
  const first = post.media[0];
  if (!first) return { thumbnailUrl: null, thumbnailKind: null, thumbnailSeconds: 0 };
  const isSingleVideo = inferInstagramPostType(post.media) === "single_video";
  return {
    thumbnailUrl: first.url,
    thumbnailKind: first.kind,
    thumbnailSeconds: first.kind === "video" && isSingleVideo ? post.instagram.coverSeconds ?? 0 : 0,
  };
}

/** Exported for tests — pick newest post file from a folder listing. */
export function newestPostPathname(pathnames: string[]): string | null {
  const posts = pathnames.filter((p) => POST_FILE_RE.test(p.slice(p.lastIndexOf("/") + 1)));
  if (!posts.length) return null;
  posts.sort((a, b) => parsePostTimestamp(b) - parsePostTimestamp(a));
  return posts[0];
}
