export const IMAGE_PREFIX = "images/";
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

export const IMAGE_CONTENT_TYPES = [...new Set(Object.values(TYPE_BY_EXTENSION))];

/** `accept` for file inputs. Extensions are listed too because some browsers report HEIC with an empty MIME type. */
export const IMAGE_ACCEPT = [...IMAGE_CONTENT_TYPES, ...Object.keys(TYPE_BY_EXTENSION).map((ext) => `.${ext}`)].join(",");

export const IMAGE_TYPES_LABEL = "JPG, PNG, WebP, GIF, or HEIC";

function extensionOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

/** Resolves the content type from the browser-reported type, falling back to the extension. Null if unsupported. */
export function imageContentType(name: string, type: string): string | null {
  const reported = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type.toLowerCase();
  if (IMAGE_CONTENT_TYPES.includes(reported)) return reported;
  if (reported && reported !== "application/octet-stream") return null;
  return TYPE_BY_EXTENSION[extensionOf(name)] ?? null;
}

export type ImageFileCheck = { contentType: string } | { error: string };

export function checkImageFile(file: { name: string; size: number; type: string }): ImageFileCheck {
  const contentType = imageContentType(file.name, file.type);
  if (!contentType) return { error: `${file.name} isn't a supported image. Use ${IMAGE_TYPES_LABEL}.` };
  if (file.size === 0) return { error: `${file.name} is empty.` };
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `${file.name} is over the ${MAX_IMAGE_BYTES / 1024 / 1024} MB limit.` };
  }
  return { contentType };
}

/** Blob pathname for an upload; Blob appends a random suffix, so names only need to be URL-safe. */
export function imageUploadPathname(name: string, contentType: string): string {
  const ext = extensionOf(name) || (Object.entries(TYPE_BY_EXTENSION).find(([, t]) => t === contentType)?.[0] ?? "jpg");
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, 100);
  return `${IMAGE_PREFIX}${base || "image"}.${ext}`;
}

export function isImagePathname(pathname: string) {
  return (
    pathname.startsWith(IMAGE_PREFIX) &&
    pathname.length > IMAGE_PREFIX.length &&
    pathname.length <= 512 &&
    !pathname.includes("..") &&
    !pathname.includes("//") &&
    !pathname.includes("\\") &&
    extensionOf(pathname) in TYPE_BY_EXTENSION
  );
}

/** Client-token constraints for `handleUpload`; throws on paths outside `images/`. */
export function imageUploadTokenOptions(pathname: string) {
  if (!isImagePathname(pathname)) throw new Error("Invalid image path");
  return {
    allowedContentTypes: IMAGE_CONTENT_TYPES,
    maximumSizeInBytes: MAX_IMAGE_BYTES,
    addRandomSuffix: true,
  };
}

/** `images/team-photo-<30 char suffix>.jpg` → `team-photo.jpg` */
export function imageDisplayName(pathname: string) {
  const name = pathname.startsWith(IMAGE_PREFIX) ? pathname.slice(IMAGE_PREFIX.length) : pathname;
  return name.replace(/-[A-Za-z0-9]{30}(\.[^.]+)$/, "$1");
}

/** Browsers other than Safari can't render HEIC, so previews fall back to an icon. */
export function isHeic(nameOrContentType: string) {
  return /heic|heif/i.test(nameOrContentType);
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

/** Runs `fn` over `items` with at most `limit` in flight. */
export async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
