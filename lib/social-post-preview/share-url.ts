export const PREVIEW_SHARE_ORIGIN = "https://media-utils.com";

export function previewShareUrl(id: string): string {
  return `${PREVIEW_SHARE_ORIGIN}/preview/${encodeURIComponent(id)}`;
}
