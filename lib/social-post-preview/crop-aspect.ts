import type { InstagramCrop, XCrop } from "@/lib/social-post-preview/types";

export function instagramCropAspect(crop: InstagramCrop): number {
  switch (crop) {
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "1.91:1":
      return 1.91;
  }
}

const X_MIN = 4 / 5;
const X_MAX = 16 / 9;

export function xSinglePhotoAspect(crop: XCrop, naturalWidth: number, naturalHeight: number): number {
  if (crop === "square") return 1;
  if (crop === "wide") return 16 / 9;
  const natural = naturalWidth / naturalHeight;
  return Math.min(X_MAX, Math.max(X_MIN, natural));
}

export const REEL_ASPECT = 9 / 16;
