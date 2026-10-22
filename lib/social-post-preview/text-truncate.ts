import { IG_CAPTION_TRUNCATE_CHARS, IG_CAPTION_TRUNCATE_LINES } from "@/lib/social-post-preview/limits";

export type TruncateResult = { visible: string; truncated: boolean };

/** Approximate Instagram feed caption truncation (2 lines or 125 chars). */
export function truncateInstagramCaption(text: string): TruncateResult {
  if (!text) return { visible: "", truncated: false };
  if (text.length <= IG_CAPTION_TRUNCATE_CHARS) {
    const lines = text.split("\n");
    if (lines.length <= IG_CAPTION_TRUNCATE_LINES) return { visible: text, truncated: false };
    return { visible: lines.slice(0, IG_CAPTION_TRUNCATE_LINES).join("\n"), truncated: true };
  }
  return { visible: text.slice(0, IG_CAPTION_TRUNCATE_CHARS), truncated: true };
}
