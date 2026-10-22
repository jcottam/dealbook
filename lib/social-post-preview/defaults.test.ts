import { describe, expect, it } from "vitest";
import { normalizePost } from "@/lib/social-post-preview/defaults";

describe("normalizePost", () => {
  it("fills defaults for empty input", () => {
    const post = normalizePost({}, { id: "abc123", now: "2026-01-01T00:00:00.000Z" });
    expect(post.id).toBe("abc123");
    expect(post.profileId).toBe("dealbook");
    expect(post.platforms).toEqual(["instagram", "x"]);
    expect(post.instagram).toEqual({ caption: "", crop: "4:5", coverSeconds: undefined });
    expect(post.x).toEqual({ text: "", crop: "original" });
    expect(post.media).toEqual([]);
  });

  it("preserves partial legacy fields", () => {
    const post = normalizePost({
      instagram: { caption: "Hi" },
      x: { text: "Tweet" },
    });
    expect(post.instagram.caption).toBe("Hi");
    expect(post.instagram.crop).toBe("4:5");
    expect(post.x.text).toBe("Tweet");
  });
});
