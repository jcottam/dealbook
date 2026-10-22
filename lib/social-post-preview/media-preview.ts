import { isHeic } from "@/lib/images";

const PREVIEW_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function extensionOf(pathOrName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(pathOrName);
  return m ? m[1].toLowerCase() : "";
}

export function isPreviewableImagePathname(pathname: string): boolean {
  return PREVIEW_IMAGE_EXT.has(extensionOf(pathname));
}

export function isHeicPathname(pathname: string): boolean {
  const ext = extensionOf(pathname);
  return ext === "heic" || ext === "heif" || isHeic(pathname);
}

export function isPreviewableVideoPathname(pathname: string): boolean {
  return extensionOf(pathname) === "mp4";
}

export type PreviewFileCheck = { ok: true; kind: "image" | "video" } | { ok: false; error: string };

export function checkPreviewUploadFile(file: { name: string; type: string }): PreviewFileCheck {
  const ext = extensionOf(file.name);
  const type = file.type.toLowerCase();

  if (type.startsWith("video/") || ext === "mp4") {
    if (ext === "mov" || type.includes("quicktime")) {
      return { ok: false, error: "Export as MP4, or run it through the video clipper." };
    }
    if (ext !== "mp4" && type !== "video/mp4") {
      return { ok: false, error: "Only MP4 videos can be previewed. Export as MP4, or run it through the video clipper." };
    }
    return { ok: true, kind: "video" };
  }

  if (isHeic(file.name) || isHeic(file.type) || ext === "heic" || ext === "heif") {
    return {
      ok: false,
      error: "HEIC can't be previewed in every browser. Upload a JPG instead.",
    };
  }

  if (!PREVIEW_IMAGE_EXT.has(ext) && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) {
    return { ok: false, error: "Use JPG, PNG, WebP, or GIF for photos in social previews." };
  }

  return { ok: true, kind: "image" };
}

export const HEIC_PICKER_NOTE = "HEIC can't be previewed in every browser. Upload a JPG instead.";
