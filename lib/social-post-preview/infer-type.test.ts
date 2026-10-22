import { describe, expect, it } from "vitest";
import { inferInstagramPostType } from "@/lib/social-post-preview/infer-type";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";

function item(kind: "image" | "video"): SocialMediaItem {
  return { pathname: "images/a/x.jpg", url: "https://x", kind, width: 100, height: 100 };
}

describe("inferInstagramPostType", () => {
  it("returns single_image for one photo", () => {
    expect(inferInstagramPostType([item("image")])).toBe("single_image");
  });

  it("returns single_video for one video", () => {
    expect(inferInstagramPostType([item("video")])).toBe("single_video");
  });

  it("returns carousel for multiple items", () => {
    expect(inferInstagramPostType([item("image"), item("video")])).toBe("carousel");
  });
});
