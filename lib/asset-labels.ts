/**
 * Labels (e.g. the original Mjoll path, or "Title slide") for shared images and clips, and tags
 * (e.g. "Post 1") for images.
 * Blob has no custom metadata, so each asset lives in its own folder and each label or tag is stored
 * as a sidecar blob in that folder whose pathname carries the text. Listing the folder returns them
 * without fetching anything.
 */

export type SidecarKind = "label" | "tag";

export const MAX_LABEL_LENGTH = 200;
const MAX_LABEL_BYTES = 400;
export const MAX_TAG_LENGTH = 60;
const SIDECAR_RE = /^(label|tag)-([A-Za-z0-9_-]+)\.txt$/;

function normalizeLine(raw: unknown, maxLength: number): string {
  if (typeof raw !== "string") return "";
  let text = raw.replace(/\s+/g, " ").trim().slice(0, maxLength);
  while (new TextEncoder().encode(text).length > MAX_LABEL_BYTES) text = text.slice(0, -1);
  return text.trim();
}

/** Single line, trimmed, capped so the sidecar pathname stays well within Blob's limit. */
export function normalizeLabel(raw: unknown): string {
  return normalizeLine(raw, MAX_LABEL_LENGTH);
}

export function normalizeTag(raw: unknown): string {
  return normalizeLine(raw, MAX_TAG_LENGTH);
}

export function normalizeSidecarText(kind: SidecarKind, raw: unknown): string {
  return kind === "tag" ? normalizeTag(raw) : normalizeLabel(raw);
}

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string) {
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** `images/abc/photo.jpg` → `images/abc/` */
export function assetFolder(pathname: string) {
  return pathname.slice(0, pathname.lastIndexOf("/") + 1);
}

export function sidecarPathname(kind: SidecarKind, assetPathname: string, text: string) {
  return `${assetFolder(assetPathname)}${kind}-${toBase64Url(text)}.txt`;
}

export function labelSidecarPathname(assetPathname: string, label: string) {
  return sidecarPathname("label", assetPathname, label);
}

export function tagSidecarPathname(assetPathname: string, tag: string) {
  return sidecarPathname("tag", assetPathname, tag);
}

function parseSidecar(pathname: string) {
  const m = SIDECAR_RE.exec(pathname.slice(pathname.lastIndexOf("/") + 1));
  return m ? { kind: m[1] as SidecarKind, encoded: m[2] } : null;
}

/** Any label or tag sidecar, or only those of `kind`. */
export function isSidecar(pathname: string, kind?: SidecarKind) {
  const parsed = parseSidecar(pathname);
  return parsed != null && (kind == null || parsed.kind === kind);
}

export function isLabelSidecar(pathname: string) {
  return isSidecar(pathname, "label");
}

/** Text stored in a `kind` sidecar pathname, or null if it isn't one (or is corrupt). */
export function textFromSidecar(kind: SidecarKind, pathname: string): string | null {
  const parsed = parseSidecar(pathname);
  if (!parsed || parsed.kind !== kind) return null;
  try {
    return normalizeSidecarText(kind, fromBase64Url(parsed.encoded)) || null;
  } catch {
    return null;
  }
}

export function labelFromSidecar(pathname: string): string | null {
  return textFromSidecar("label", pathname);
}

export function tagFromSidecar(pathname: string): string | null {
  return textFromSidecar("tag", pathname);
}

export const CLIP_PREFIX = "clips/";

/** Exported clips: `clips/<uuid>/<name>.mp4` */
export function isClipPathname(pathname: string) {
  return /^clips\/[0-9a-f-]{36}\/[^/\\]+\.mp4$/.test(pathname) && !pathname.includes("..");
}
