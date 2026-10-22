/** Long edge cap for photos uploaded through Social Post Preview (feed-adequate, smaller Blob objects). */
export const SOCIAL_IMAGE_MAX_EDGE = 1440;

export const SOCIAL_IMAGE_WEBP_QUALITY = 0.85;

export function scaleToMaxEdge(width: number, height: number, maxEdge = SOCIAL_IMAGE_MAX_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** GIFs keep animation; other raster types are resized and encoded as WebP. */
export function shouldCompressSocialImage(file: { type: string; name: string }): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/gif") return false;
  if (t.endsWith("gif") || file.name.toLowerCase().endsWith(".gif")) return false;
  return true;
}

export async function compressImageForSocialUpload(file: File): Promise<File> {
  if (!shouldCompressSocialImage(file)) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = scaleToMaxEdge(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image for upload.");

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not compress image."))),
        "image/webp",
        SOCIAL_IMAGE_WEBP_QUALITY,
      );
    });

    const base = file.name.replace(/\.[^.]+$/i, "") || "image";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
