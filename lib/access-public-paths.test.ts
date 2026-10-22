import { describe, expect, it } from "vitest";
import { isAccessPublicPath } from "@/lib/access-public-paths";

describe("isAccessPublicPath", () => {
  it("allows share pages and comment API", () => {
    expect(isAccessPublicPath("/preview/abc")).toBe(true);
    expect(isAccessPublicPath("/api/social-post-preview/abc/comments")).toBe(true);
  });

  it("blocks internal tools and other APIs", () => {
    expect(isAccessPublicPath("/")).toBe(false);
    expect(isAccessPublicPath("/social-post-preview")).toBe(false);
    expect(isAccessPublicPath("/api/images")).toBe(false);
    expect(isAccessPublicPath("/api/social-post-preview")).toBe(false);
    expect(isAccessPublicPath("/api/social-post-preview/abc")).toBe(false);
  });
});
