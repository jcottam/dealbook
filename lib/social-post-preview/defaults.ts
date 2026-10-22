import { newPreviewId } from "@/lib/social-post-preview/id";
import type {
  InstagramCrop,
  InstagramFields,
  Platform,
  PublicSocialPost,
  SocialMediaItem,
  SocialPost,
  XCrop,
  XFields,
} from "@/lib/social-post-preview/types";

export const DEFAULT_PROFILE_ID = "dealbook";
const DEFAULT_PLATFORMS: Platform[] = ["instagram", "x"];

function defaultInstagram(): InstagramFields {
  return { caption: "", crop: "4:5" };
}

function defaultX(): XFields {
  return { text: "", crop: "original" };
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asPlatforms(v: unknown): Platform[] {
  if (v === undefined) return [...DEFAULT_PLATFORMS];
  if (!Array.isArray(v)) return [...DEFAULT_PLATFORMS];
  return v.filter((p): p is Platform => p === "instagram" || p === "x");
}

function asCropIg(v: unknown): InstagramCrop {
  if (v === "1:1" || v === "4:5" || v === "1.91:1") return v;
  return "4:5";
}

function asCropX(v: unknown): XCrop {
  if (v === "original" || v === "wide" || v === "square") return v;
  return "original";
}

function asMediaItem(raw: unknown): SocialMediaItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pathname = asString(o.pathname);
  const url = asString(o.url);
  const kind = o.kind === "video" ? "video" : o.kind === "image" ? "image" : null;
  const width = Number(o.width);
  const height = Number(o.height);
  if (!pathname || !url || !kind || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  const durationSeconds = o.durationSeconds != null ? Number(o.durationSeconds) : undefined;
  return {
    pathname,
    url,
    kind,
    width,
    height,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
  };
}

function asInstagram(raw: unknown): InstagramFields {
  const base = defaultInstagram();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const cover = o.coverSeconds != null ? Number(o.coverSeconds) : undefined;
  return {
    caption: asString(o.caption),
    crop: asCropIg(o.crop),
    coverSeconds: Number.isFinite(cover) && cover! > 0 ? cover : undefined,
  };
}

function asX(raw: unknown): XFields {
  const base = defaultX();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return { text: asString(o.text), crop: asCropX(o.crop) };
}

/** Fill missing fields; safe for partial or older saved JSON. */
export function normalizePost(raw: unknown, opts?: { id?: string; now?: string }): SocialPost {
  const now = opts?.now ?? new Date().toISOString();
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const media = Array.isArray(o.media) ? o.media.map(asMediaItem).filter((m): m is SocialMediaItem => m != null) : [];
  const createdAt = asString(o.createdAt) || now;
  return {
    id: asString(o.id) || opts?.id || newPreviewId(),
    name: asString(o.name),
    profileId: asString(o.profileId) || DEFAULT_PROFILE_ID,
    platforms: asPlatforms(o.platforms),
    media,
    instagram: asInstagram(o.instagram),
    x: asX(o.x),
    createdAt,
    updatedAt: asString(o.updatedAt) || createdAt,
  };
}

export function toPublicPost(post: SocialPost): PublicSocialPost {
  const { name: _discard, ...rest } = post;
  void _discard;
  return rest;
}
