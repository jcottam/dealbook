import { describe, expect, it } from "vitest";
import {
  normalizePreviewCommentAuthor,
  normalizePreviewCommentText,
  parseCommentTimestamp,
} from "@/lib/social-post-preview/comments";

describe("parseCommentTimestamp", () => {
  it("reads timestamp from comment filename", () => {
    expect(parseCommentTimestamp("previews/abc/comment-1700000000000.json")).toBe(1700000000000);
  });

  it("returns 0 for non-comment files", () => {
    expect(parseCommentTimestamp("previews/abc/post-100.json")).toBe(0);
  });
});

describe("normalizePreviewCommentAuthor", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizePreviewCommentAuthor("  Jane   Doe  ")).toBe("Jane Doe");
  });

  it("returns empty for non-strings", () => {
    expect(normalizePreviewCommentAuthor(null)).toBe("");
  });
});

describe("normalizePreviewCommentText", () => {
  it("trims text", () => {
    expect(normalizePreviewCommentText("  hello  ")).toBe("hello");
  });
});
