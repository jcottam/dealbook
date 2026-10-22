import { describe, expect, it } from "vitest";
import { checkPreviewUploadFile, isHeicPathname } from "@/lib/social-post-preview/media-preview";

describe("media-preview", () => {
  it("rejects HEIC uploads", () => {
    const r = checkPreviewUploadFile({ name: "photo.heic", type: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("HEIC");
  });

  it("rejects MOV uploads", () => {
    const r = checkPreviewUploadFile({ name: "clip.mov", type: "video/quicktime" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("MP4");
  });

  it("accepts mp4", () => {
    expect(checkPreviewUploadFile({ name: "a.mp4", type: "video/mp4" })).toEqual({ ok: true, kind: "video" });
  });

  it("flags HEIC pathnames for picker", () => {
    expect(isHeicPathname("images/abc/photo.heic")).toBe(true);
  });
});
