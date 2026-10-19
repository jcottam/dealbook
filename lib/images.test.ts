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
  runWithConcurrency,
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

describe("imageUploadPathname", () => {
  it("keeps a readable, URL-safe name under images/", () => {
    expect(imageUploadPathname("Sorkin keynote (final).JPG", "image/jpeg")).toBe("images/Sorkin_keynote_final.jpg");
    expect(imageUploadPathname("../../etc.png", "image/png")).toBe("images/etc.png");
  });

  it("adds an extension from the content type and a default name", () => {
    expect(imageUploadPathname("pasted", "image/png")).toBe("images/pasted.png");
    expect(imageUploadPathname("???.webp", "image/webp")).toBe("images/image.webp");
  });

  it("always produces a pathname the server accepts", () => {
    for (const name of ["a b.png", "../x.jpg", "a..b.png", "日本.heic", ".gif"]) {
      const contentType = imageContentType(name, "")!;
      expect(isImagePathname(imageUploadPathname(name, contentType))).toBe(true);
    }
  });
});

describe("isImagePathname", () => {
  it("only allows image files under images/", () => {
    expect(isImagePathname("images/a.jpg")).toBe(true);
    expect(isImagePathname("images/")).toBe(false);
    expect(isImagePathname("clips/abc/a.jpg")).toBe(false);
    expect(isImagePathname("uploads/a.jpg")).toBe(false);
    expect(isImagePathname("images/../clips/a.jpg")).toBe(false);
    expect(isImagePathname("images//a.jpg")).toBe(false);
    expect(isImagePathname("images/a.mp4")).toBe(false);
    expect(isImagePathname(`images/${"a".repeat(600)}.jpg`)).toBe(false);
  });
});

describe("imageUploadTokenOptions", () => {
  it("restricts client tokens to images with a size cap and random suffix", () => {
    expect(imageUploadTokenOptions("images/a.png")).toEqual({
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"],
      maximumSizeInBytes: MAX_IMAGE_BYTES,
      addRandomSuffix: true,
    });
  });

  it("throws for paths outside images/", () => {
    expect(() => imageUploadTokenOptions("clips/x/a.png")).toThrow("Invalid image path");
  });
});

describe("imageDisplayName", () => {
  it("strips the prefix and Blob's random suffix", () => {
    expect(imageDisplayName("images/team-photo-oYnXSVczoLa9yBYMFJOSNdaiiervF5.jpg")).toBe("team-photo.jpg");
    expect(imageDisplayName("images/no-suffix.png")).toBe("no-suffix.png");
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
