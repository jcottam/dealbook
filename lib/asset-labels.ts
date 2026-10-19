/**
 * Labels (e.g. the original Mjoll path, or "Title slide") for shared images and clips.
 * Blob has no custom metadata, so each asset lives in its own folder and the label is stored as a
 * sidecar blob in that folder whose pathname carries the label. Listing the folder returns it
 * without fetching anything.
 */

export const MAX_LABEL_LENGTH = 200;
const MAX_LABEL_BYTES = 400;
const SIDECAR_RE = /^label-([A-Za-z0-9_-]+)\.txt$/;

/** Single line, trimmed, capped so the sidecar pathname stays well within Blob's limit. */
export function normalizeLabel(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let label = raw.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
  while (new TextEncoder().encode(label).length > MAX_LABEL_BYTES) label = label.slice(0, -1);
  return label.trim();
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

export function labelSidecarPathname(assetPathname: string, label: string) {
  return `${assetFolder(assetPathname)}label-${toBase64Url(label)}.txt`;
}

export function isLabelSidecar(pathname: string) {
  return SIDECAR_RE.test(pathname.slice(pathname.lastIndexOf("/") + 1));
}

/** Label stored in a sidecar pathname, or null if it isn't one (or is corrupt). */
export function labelFromSidecar(pathname: string): string | null {
  const m = SIDECAR_RE.exec(pathname.slice(pathname.lastIndexOf("/") + 1));
  if (!m) return null;
  try {
    return normalizeLabel(fromBase64Url(m[1])) || null;
  } catch {
    return null;
  }
}

export const CLIP_PREFIX = "clips/";

/** Exported clips: `clips/<uuid>/<name>.mp4` */
export function isClipPathname(pathname: string) {
  return /^clips\/[0-9a-f-]{36}\/[^/\\]+\.mp4$/.test(pathname) && !pathname.includes("..");
}
