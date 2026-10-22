import { describe, expect, it } from "vitest";
import { normalizePost } from "@/lib/social-post-preview/defaults";
import { shouldShowShareBlockers, validateForShare } from "@/lib/social-post-preview/checks";
import type { SocialPost } from "@/lib/social-post-preview/types";

function base(over: Partial<SocialPost> = {}): SocialPost {
  return normalizePost({
    id: "id1",
    name: "Test",
    platforms: ["instagram", "x"],
    media: [
      {
        pathname: "images/aaaaaaaaaa/photo.jpg",
        url: "https://example.com/photo.jpg",
        kind: "image",
        width: 1000,
        height: 1000,
      },
    ],
    instagram: { caption: "Hello #deal", crop: "4:5" },
    x: { text: "Hello", crop: "original" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  });
}

describe("shouldShowShareBlockers", () => {
  it("hides blockers on an empty draft", () => {
    const post = normalizePost({});
    expect(validateForShare(post).ok).toBe(false);
    expect(shouldShowShareBlockers(post)).toBe(false);
  });

  it("shows blockers when media is added but captions are empty", () => {
    const post = base({ instagram: { caption: "", crop: "4:5" }, x: { text: "", crop: "original" } });
    expect(shouldShowShareBlockers(post)).toBe(true);
  });

  it("shows blockers when copy is entered but media is missing", () => {
    const post = base({
      media: [],
      instagram: { caption: "Hello", crop: "4:5" },
      x: { text: "", crop: "original" },
    });
    expect(shouldShowShareBlockers(post)).toBe(true);
  });
});

describe("validateForShare", () => {
  it("passes a valid post", () => {
    expect(validateForShare(base())).toEqual({ ok: true });
  });

  it("needs a platform", () => {
    const r = validateForShare(base({ platforms: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].title).toBe("Needs a platform");
  });

  it("needs media when Instagram on", () => {
    const r = validateForShare(base({ media: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Needs media")).toBe(true);
  });

  it("needs Instagram caption", () => {
    const r = validateForShare(base({ instagram: { caption: "  ", crop: "4:5" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Needs an Instagram caption")).toBe(true);
  });

  it("needs X text", () => {
    const r = validateForShare(base({ x: { text: "", crop: "original" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Needs X post text")).toBe(true);
  });

  it("rejects X text over 280", () => {
    const r = validateForShare(base({ x: { text: "x".repeat(281), crop: "original" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Too long for X")).toBe(true);
  });

  it("rejects more than 4 media for X", () => {
    const media = Array.from({ length: 5 }, (_, i) => ({
      pathname: `images/aaaaaaaaa${i}/p.jpg`,
      url: `https://x/${i}`,
      kind: "image" as const,
      width: 1,
      height: 1,
    }));
    const r = validateForShare(base({ media }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Too much media for X")).toBe(true);
  });

  it("rejects long X video", () => {
    const r = validateForShare(
      base({
        media: [
          {
            pathname: "clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/a.mp4",
            url: "https://x/v.mp4",
            kind: "video",
            width: 1920,
            height: 1080,
            durationSeconds: 141,
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Video is too long for X")).toBe(true);
  });

  it("rejects IG reel over 3 minutes", () => {
    const r = validateForShare(
      base({
        media: [
          {
            pathname: "clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/a.mp4",
            url: "https://x/v.mp4",
            kind: "video",
            width: 1080,
            height: 1920,
            durationSeconds: 181,
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Video is too long for a Reel")).toBe(true);
  });

  it("rejects carousel over 20", () => {
    const media = Array.from({ length: 21 }, (_, i) => ({
      pathname: `images/aaaaaaaaa${i}/p.jpg`,
      url: `https://x/${i}`,
      kind: "image" as const,
      width: 1,
      height: 1,
    }));
    const r = validateForShare(base({ media }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Too many slides")).toBe(true);
  });

  it("rejects long caption", () => {
    const r = validateForShare(base({ instagram: { caption: "a".repeat(2201), crop: "4:5" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Caption is too long")).toBe(true);
  });

  it("rejects too many hashtags", () => {
    const tags = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(" ");
    const r = validateForShare(base({ instagram: { caption: tags, crop: "4:5" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.title === "Too many hashtags")).toBe(true);
  });

  it("skips Instagram checks when Instagram off", () => {
    const r = validateForShare(
      base({
        platforms: ["x"],
        media: [],
        instagram: { caption: "", crop: "4:5" },
      }),
    );
    expect(r.ok).toBe(true);
  });
});
