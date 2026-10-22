import { CLIP_PREFIX, isClipPathname } from "@/lib/asset-labels";

export const MAX_CLIP_UPLOAD_BYTES = 1024 * 1024 * 1024;
export const CLIP_CONTENT_TYPE = "video/mp4";

export function checkClipFile(file: { name: string; size: number; type: string }): { contentType: string } | { error: string } {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "mov" || file.type.toLowerCase().includes("quicktime")) {
    return { error: "Export as MP4, or run it through the video clipper." };
  }
  if (ext !== "mp4" && file.type.toLowerCase() !== "video/mp4") {
    return { error: "Only MP4 videos can be uploaded here." };
  }
  if (file.size === 0) return { error: `${file.name} is empty.` };
  if (file.size > MAX_CLIP_UPLOAD_BYTES) {
    return { error: `${file.name} is over the ${MAX_CLIP_UPLOAD_BYTES / 1024 / 1024 / 1024} GB limit.` };
  }
  return { contentType: CLIP_CONTENT_TYPE };
}

export function safeClipFilename(name: string): string {
  const basename = name.split(/[/\\]/).pop() ?? "video.mp4";
  const base = basename.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 80);
  return `${base || "video"}.mp4`;
}

export function clipUploadPathname(filename: string): string {
  return `${CLIP_PREFIX}${crypto.randomUUID()}/${safeClipFilename(filename)}`;
}

export function clipUploadTokenOptions(pathname: string) {
  if (!isClipPathname(pathname)) throw new Error("Invalid clip path");
  return {
    allowedContentTypes: [CLIP_CONTENT_TYPE],
    maximumSizeInBytes: MAX_CLIP_UPLOAD_BYTES,
    addRandomSuffix: false,
  };
}
