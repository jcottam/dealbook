import { describe, expect, it } from "vitest";
import {
  checkImageFile,
  formatBytes,
  IMAGE_ACCEPT,
  imageContentType,
  imageDisplayName,
  imageUploadPathname,
  imageUploadTokenOptions,
  isImagePathname,
  MAX_IMAGE_BYTES,
  newImageId,
  runWithConcurrency,
  sortImages,
} from "@/lib/images";

describe("imageContentType", () => {
  it("accepts supported browser-reported types", () => {
    expect(imageContentType("a.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(imageContentType("a.png", "image/png")).toBe("image/png");
    expect(imageContentType("a.webp", "IMAGE/WEBP")).toBe("image/webp");
    expect(imageContentType("a.jpg", "image/jpg")).toBe("image/jpeg");
  });

  it("falls back to the extension when the browser reports nothing (HEIC on Chrome)", () => {
    expect(imageContentType("IMG_0001.HEIC", "")).toBe("image/heic");
    expect(imageContentType("photo.heif", "application/octet-stream")).toBe("image/heif");
  });

  it("rejects other types even with an image extension", () => {
    expect(imageContentType("vector.svg", "image/svg+xml")).toBeNull();
    expect(imageContentType("clip.mp4", "video/mp4")).toBeNull();
    expect(imageContentType("fake.jpg", "text/html")).toBeNull();
    expect(imageContentType("noext", "")).toBeNull();
  });

  it("lists extensions in the input accept string for HEIC", () => {
    expect(IMAGE_ACCEPT.split(",")).toEqual(expect.arrayContaining(["image/heic", ".heic", ".jpg"]));
  });
});

describe("checkImageFile", () => {
  it("returns the content type for valid files", () => {
    expect(checkImageFile({ name: "a.png", size: 10, type: "image/png" })).toEqual({ contentType: "image/png" });
  });

  it("rejects empty, oversized, and unsupported files", () => {
    expect(checkImageFile({ name: "a.png", size: 0, type: "image/png" })).toHaveProperty("error");
    expect(checkImageFile({ name: "a.png", size: MAX_IMAGE_BYTES + 1, type: "image/png" })).toEqual({
      error: "a.png is over the 50 MB limit.",
    });
    expect(checkImageFile({ name: "a.tiff", size: 10, type: "image/tiff" })).toHaveProperty("error");
  });
});

const ID = "a1b2c3d4e5";

describe("imageUploadPathname", () => {
  it("keeps the original filename readable in its own folder", () => {
    expect(imageUploadPathname(ID, "_DSC0457.jpg", "image/jpeg")).toBe(`images/${ID}/_DSC0457.jpg`);
    expect(imageUploadPathname(ID, "Sorkin keynote (final).JPG", "image/jpeg")).toBe(`images/${ID}/Sorkin_keynote_final.jpg`);
    expect(imageUploadPathname(ID, "../../etc.png", "image/png")).toBe(`images/${ID}/etc.png`);
  });

  it("adds an extension from the content type and a default name", () => {
    expect(imageUploadPathname(ID, "pasted", "image/png")).toBe(`images/${ID}/pasted.png`);
    expect(imageUploadPathname(ID, "???.webp", "image/webp")).toBe(`images/${ID}/image.webp`);
  });

  it("always produces a pathname the server accepts", () => {
    for (const name of ["a b.png", "../x.jpg", "a..b.png", "日本.heic", ".gif", "_DSC0457.JPG"]) {
      const contentType = imageContentType(name, "")!;
      expect(isImagePathname(imageUploadPathname(newImageId(), name, contentType))).toBe(true);
    }
  });
});

describe("newImageId", () => {
  it("is 10 lowercase alphanumerics and varies", () => {
    expect(newImageId()).toMatch(/^[a-z0-9]{10}$/);
    expect(new Set(Array.from({ length: 20 }, newImageId)).size).toBe(20);
  });
});

describe("isImagePathname", () => {
  it("only allows images/<id>/<image file>", () => {
    expect(isImagePathname(`images/${ID}/a.jpg`)).toBe(true);
    expect(isImagePathname("images/a.jpg")).toBe(false);
    expect(isImagePathname(`images/${ID}/`)).toBe(false);
    expect(isImagePathname(`images/${ID}/sub/a.jpg`)).toBe(false);
    expect(isImagePathname(`images/${ID}/label-YQ.txt`)).toBe(false);
    expect(isImagePathname(`clips/${ID}/a.jpg`)).toBe(false);
    expect(isImagePathname(`images/${ID}/../a.jpg`)).toBe(false);
    expect(isImagePathname(`images/${ID}/a.mp4`)).toBe(false);
    expect(isImagePathname(`images/${ID}/${"a".repeat(600)}.jpg`)).toBe(false);
  });
});

describe("imageUploadTokenOptions", () => {
  it("restricts client tokens to images with a size cap and no random suffix", () => {
    expect(imageUploadTokenOptions(`images/${ID}/a.png`)).toEqual({
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"],
      maximumSizeInBytes: MAX_IMAGE_BYTES,
      addRandomSuffix: false,
    });
  });

  it("throws for other paths", () => {
    expect(() => imageUploadTokenOptions("clips/x/a.png")).toThrow("Invalid image path");
    expect(() => imageUploadTokenOptions("images/a.png")).toThrow("Invalid image path");
  });
});

describe("imageDisplayName", () => {
  it("is the original filename", () => {
    expect(imageDisplayName(`images/${ID}/_DSC0457.jpg`)).toBe("_DSC0457.jpg");
  });
});

describe("formatBytes", () => {
  it("formats KB and MB", () => {
    expect(formatBytes(10)).toBe("1 KB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });
});

describe("runWithConcurrency", () => {
  it("processes every item without exceeding the limit", async () => {
    let active = 0;
    let peak = 0;
    const seen: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(n);
      active--;
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });

  it("handles an empty list", async () => {
    await expect(runWithConcurrency([], 3, async () => {})).resolves.toBeUndefined();
  });
});

describe("sortImages", () => {
  const img = (name: string, tag: string | null, day: number) => ({
    name,
    tag,
    uploadedAt: `2026-10-${String(day).padStart(2, "0")}T00:00:00.000Z`,
  });
  const images = [
    img("a", "Post 10", 1),
    img("b", null, 2),
    img("c", "post 2", 3),
    img("d", "Post 9", 4),
    img("e", null, 5),
    img("f", "Post 2", 6),
    img("g", "Title", 7),
  ];

  it("sorts newest first by default without mutating the input", () => {
    expect(sortImages(images, "newest").map((i) => i.name)).toEqual(["g", "f", "e", "d", "c", "b", "a"]);
    expect(images[0].name).toBe("a");
  });

  it("sorts tags naturally and case-insensitively, newest first within a tag, untagged last", () => {
    expect(sortImages(images, "tag").map((i) => i.name)).toEqual(["f", "c", "d", "a", "g", "e", "b"]);
  });

  it("treats missing and blank tags as untagged", () => {
    const legacy = [{ uploadedAt: "2026-10-01T00:00:00.000Z" }, { tag: " ", uploadedAt: "2026-10-03T00:00:00.000Z" }, { tag: "Post 1", uploadedAt: "2026-10-02T00:00:00.000Z" }];
    expect(sortImages(legacy, "tag").map((i) => i.uploadedAt.slice(8, 10))).toEqual(["02", "03", "01"]);
  });
});
