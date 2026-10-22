/** Production custom domain; server fallback when request origin is unknown. */
export const PREVIEW_SHARE_ORIGIN = "https://media-utils.com";

/** Origin for share links — browser uses the current host; server uses env fallbacks. */
export function previewShareOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) return siteUrl;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return PREVIEW_SHARE_ORIGIN;
}

export function previewShareUrl(id: string): string {
  return `${previewShareOrigin()}/preview/${encodeURIComponent(id)}`;
}

export function previewEditorPath(id: string): string {
  return `/social-post-preview?edit=${encodeURIComponent(id)}`;
}
