import { list, put } from "@vercel/blob";
import { publicBlobToken } from "@/lib/blob";
import { readPreviewPost, PREVIEW_PREFIX } from "@/lib/social-post-preview/storage";
import type { PreviewComment } from "@/lib/social-post-preview/types";

export const MAX_PREVIEW_COMMENT_AUTHOR = 80;
export const MAX_PREVIEW_COMMENT_TEXT = 2000;

const COMMENT_FILE_RE = /^comment-(\d+)\.json$/;
const LIST_PAGE_LIMIT = 1000;
const MAX_LIST_PAGES = 20;

function previewFolder(id: string) {
  return `${PREVIEW_PREFIX}${id}/`;
}

function commentFilename(now = Date.now()) {
  return `comment-${now}.json`;
}

export function parseCommentTimestamp(pathname: string): number {
  const name = pathname.slice(pathname.lastIndexOf("/") + 1);
  const m = COMMENT_FILE_RE.exec(name);
  return m ? Number(m[1]) : 0;
}

export function normalizePreviewCommentAuthor(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_PREVIEW_COMMENT_AUTHOR);
}

export function normalizePreviewCommentText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_PREVIEW_COMMENT_TEXT);
}

function isValidPreviewId(id: string) {
  return Boolean(id) && !id.includes("/") && !id.includes("..");
}

async function listFolder(prefix: string) {
  const token = publicBlobToken();
  const blobs: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const result = await list({ prefix, limit: LIST_PAGE_LIMIT, cursor, token });
    for (const b of result.blobs) {
      blobs.push({ pathname: b.pathname, url: b.url });
    }
    if (!result.hasMore) break;
    cursor = result.cursor;
  }
  return blobs;
}

export async function listPreviewComments(previewId: string): Promise<PreviewComment[] | null> {
  if (!isValidPreviewId(previewId)) return null;
  const post = await readPreviewPost(previewId);
  if (!post) return null;

  const blobs = await listFolder(previewFolder(previewId));
  const commentBlobs = blobs.filter((b) =>
    COMMENT_FILE_RE.test(b.pathname.slice(b.pathname.lastIndexOf("/") + 1)),
  );
  commentBlobs.sort((a, b) => parseCommentTimestamp(a.pathname) - parseCommentTimestamp(b.pathname));

  const comments: PreviewComment[] = [];
  for (const blob of commentBlobs) {
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) continue;
    const data = (await res.json()) as Partial<PreviewComment>;
    const id = String(parseCommentTimestamp(blob.pathname));
    const author = normalizePreviewCommentAuthor(data.author);
    const text = normalizePreviewCommentText(data.text);
    if (!author || !text) continue;
    const createdAt =
      typeof data.createdAt === "string" && !Number.isNaN(Date.parse(data.createdAt))
        ? data.createdAt
        : new Date(parseCommentTimestamp(blob.pathname)).toISOString();
    comments.push({ id, author, text, createdAt });
  }

  return comments;
}

export type AddPreviewCommentResult =
  | { ok: true; comment: PreviewComment }
  | { ok: false; status: 404; error: string }
  | { ok: false; status: 400; error: string };

export async function addPreviewComment(
  previewId: string,
  input: { author: unknown; text: unknown },
): Promise<AddPreviewCommentResult> {
  if (!isValidPreviewId(previewId)) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const author = normalizePreviewCommentAuthor(input.author);
  const text = normalizePreviewCommentText(input.text);
  if (!author) return { ok: false, status: 400, error: "Name is required." };
  if (!text) return { ok: false, status: 400, error: "Comment is required." };

  const post = await readPreviewPost(previewId);
  if (!post) return { ok: false, status: 404, error: "Not found" };

  const now = Date.now();
  const comment: PreviewComment = {
    id: String(now),
    author,
    text,
    createdAt: new Date(now).toISOString(),
  };

  const token = publicBlobToken();
  const pathname = `${previewFolder(previewId)}${commentFilename(now)}`;
  await put(pathname, JSON.stringify(comment), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
    token,
  });

  return { ok: true, comment };
}
