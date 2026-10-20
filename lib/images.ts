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

const IMAGE_PATHNAME_RE = /^images\/[a-z0-9]{10}\/[^/\\]+$/;

/** Random folder per image, so the original filename stays as-is in the public URL. */
export function newImageId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}

/** URL-safe version of the original filename, e.g. `_DSC0457.jpg` stays `_DSC0457.jpg`. */
export function safeImageFilename(name: string, contentType: string) {
  const basename = name.split(/[/\\]/).pop() ?? "";
  const ext = extensionOf(basename) || (Object.entries(TYPE_BY_EXTENSION).find(([, t]) => t === contentType)?.[0] ?? "jpg");
  const base = basename
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|[_.]+$/g, "")
    .slice(0, 100);
  return `${base || "image"}.${ext}`;
}

/** `images/<id>/<filename>` */
export function imageUploadPathname(id: string, name: string, contentType: string): string {
  return `${IMAGE_PREFIX}${id}/${safeImageFilename(name, contentType)}`;
}

export function isImagePathname(pathname: string) {
  return (
    IMAGE_PATHNAME_RE.test(pathname) &&
    pathname.length <= 512 &&
    !pathname.includes("..") &&
    extensionOf(pathname) in TYPE_BY_EXTENSION
  );
}

/** Client-token constraints for `handleUpload`; throws on anything but `images/<id>/<image file>`. */
export function imageUploadTokenOptions(pathname: string) {
  if (!isImagePathname(pathname)) throw new Error("Invalid image path");
  return {
    allowedContentTypes: IMAGE_CONTENT_TYPES,
    maximumSizeInBytes: MAX_IMAGE_BYTES,
    addRandomSuffix: false,
  };
}

/** `images/<id>/_DSC0457.jpg` → `_DSC0457.jpg` */
export function imageDisplayName(pathname: string) {
  return pathname.slice(pathname.lastIndexOf("/") + 1);
}

/** Browsers other than Safari can't render HEIC, so previews fall back to an icon. */
export function isHeic(nameOrContentType: string) {
  return /heic|heif/i.test(nameOrContentType);
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

export type ImageSort = "newest" | "tag";

export const IMAGE_SORT_OPTIONS: { value: ImageSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "tag", label: "Tag (A–Z)" },
];

const tagCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * "newest": by upload time, newest first.
 * "tag": natural order, case-insensitive ("Post 2" < "Post 9" < "Post 10"), newest first within a tag,
 * untagged last (newest first).
 */
export function sortImages<T extends { tag?: string | null; uploadedAt: string }>(images: T[], sort: ImageSort): T[] {
  const newest = (a: T, b: T) => b.uploadedAt.localeCompare(a.uploadedAt);
  if (sort === "newest") return [...images].sort(newest);
  return [...images].sort((a, b) => {
    const ta = a.tag?.trim() ?? "";
    const tb = b.tag?.trim() ?? "";
    if (!ta !== !tb) return ta ? -1 : 1;
    return (ta && tb ? tagCollator.compare(ta, tb) : 0) || newest(a, b);
  });
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
