import type { SocialMediaItem } from "@/lib/social-post-preview/types";

/** Append or update items by pathname; preserves order of existing, appends new pathnames. */
export function mergeMediaItems(existing: SocialMediaItem[], incoming: SocialMediaItem[]): SocialMediaItem[] {
  const byPath = new Map(existing.map((m) => [m.pathname, m]));
  for (const item of incoming) byPath.set(item.pathname, item);
  return [...byPath.values()];
}

export function reorderMediaItems(items: SocialMediaItem[], from: number, to: number): SocialMediaItem[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}
