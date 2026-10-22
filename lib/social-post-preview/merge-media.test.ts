import { describe, expect, it } from "vitest";
import { mergeMediaItems, reorderMediaItems } from "@/lib/social-post-preview/merge-media";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";

function item(pathname: string): SocialMediaItem {
  return {
    pathname,
    url: `https://example.com/${pathname}`,
    kind: "image",
    width: 100,
    height: 100,
  };
}

describe("mergeMediaItems", () => {
  it("appends new pathnames in order", () => {
    const a = item("images/a/x.jpg");
    const b = item("images/b/x.jpg");
    const c = item("images/c/x.jpg");
    expect(mergeMediaItems([], [a])).toEqual([a]);
    expect(mergeMediaItems([a], [b])).toEqual([a, b]);
    expect(mergeMediaItems([a, b], [c])).toEqual([a, b, c]);
  });

  it("updates an existing pathname in place", () => {
    const a = item("images/a/x.jpg");
    const a2 = { ...a, width: 200 };
    expect(mergeMediaItems([a], [a2])).toEqual([a2]);
  });
});

describe("reorderMediaItems", () => {
  it("moves an item to a new index", () => {
    const items = [item("a"), item("b"), item("c")];
    expect(reorderMediaItems(items, 0, 2).map((i) => i.pathname)).toEqual(["b", "c", "a"]);
  });
});
