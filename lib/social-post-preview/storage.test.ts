import { describe, expect, it } from "vitest";
import { newestPostPathname, previewThumbnail } from "@/lib/social-post-preview/storage";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";

describe("newestPostPathname", () => {
  it("picks the highest timestamp", () => {
    const paths = [
      "previews/abc/post-100.json",
      "previews/abc/post-200.json",
      "previews/abc/post-50.json",
    ];
    expect(newestPostPathname(paths)).toBe("previews/abc/post-200.json");
  });
});

describe("previewThumbnail", () => {
  const video: SocialMediaItem = {
    pathname: "clips/u/clip.mp4",
    url: "https://example.com/clip.mp4",
    kind: "video",
    width: 1080,
    height: 1920,
  };
  const image: SocialMediaItem = {
    pathname: "images/a/photo.jpg",
    url: "https://example.com/photo.jpg",
    kind: "image",
    width: 1000,
    height: 1000,
  };

  it("is empty without media", () => {
    expect(previewThumbnail({ media: [], instagram: { caption: "", crop: "4:5" } })).toEqual({
      thumbnailUrl: null,
      thumbnailKind: null,
      thumbnailSeconds: 0,
    });
  });

  it("uses the cover frame for single-video posts", () => {
    expect(previewThumbnail({ media: [video], instagram: { caption: "", crop: "4:5", coverSeconds: 2.5 } })).toEqual({
      thumbnailUrl: video.url,
      thumbnailKind: "video",
      thumbnailSeconds: 2.5,
    });
  });

  it("starts at 0 for a video that leads a carousel", () => {
    expect(
      previewThumbnail({ media: [video, image], instagram: { caption: "", crop: "4:5", coverSeconds: 2.5 } }),
    ).toMatchObject({ thumbnailKind: "video", thumbnailSeconds: 0 });
  });

  it("marks images", () => {
    expect(previewThumbnail({ media: [image], instagram: { caption: "", crop: "4:5" } })).toMatchObject({
      thumbnailUrl: image.url,
      thumbnailKind: "image",
    });
  });
});
