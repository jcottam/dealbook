import { countHashtags } from "@/lib/social-post-preview/hashtags";
import { inferInstagramPostType } from "@/lib/social-post-preview/infer-type";
import {
  IG_CAPTION_MAX,
  IG_CAROUSEL_MAX,
  IG_HASHTAG_MAX,
  IG_REEL_MAX_SECONDS,
  X_MEDIA_MAX,
  X_TEXT_MAX,
  X_VIDEO_MAX_SECONDS,
} from "@/lib/social-post-preview/limits";
import type { PreviewShareIssue, PreviewShareValidation, SocialPost } from "@/lib/social-post-preview/types";
import { imageDisplayName } from "@/lib/images";
import { isClipPathname } from "@/lib/asset-labels";

function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function mediaDisplayName(pathname: string): string {
  if (isClipPathname(pathname)) return imageDisplayName(pathname);
  return imageDisplayName(pathname);
}

export function validateForShare(post: SocialPost): PreviewShareValidation {
  const issues: PreviewShareIssue[] = [];
  const igOn = post.platforms.includes("instagram");
  const xOn = post.platforms.includes("x");

  if (!igOn && !xOn) {
    issues.push({
      title: "Needs a platform",
      fix: "Turn on Instagram, X, or both under Platforms.",
    });
  }

  if (igOn && post.media.length === 0) {
    issues.push({
      title: "Needs media",
      fix: "Instagram posts need a photo or video. Add media under Media, or turn off Instagram.",
    });
  }

  if (igOn && !post.instagram.caption.trim()) {
    issues.push({
      title: "Needs an Instagram caption",
      fix: "Write it in the Instagram section.",
    });
  }

  if (xOn && !post.x.text.trim()) {
    issues.push({
      title: "Needs X post text",
      fix: "Write it in the X section, or copy the Instagram caption if it fits.",
    });
  }

  if (xOn) {
    const len = post.x.text.length;
    if (len > X_TEXT_MAX) {
      const over = len - X_TEXT_MAX;
      issues.push({
        title: "Too long for X",
        fix: `${len} characters, ${over} over X's ${X_TEXT_MAX} limit. Shorten the X post text.`,
      });
    }
  }

  if (xOn && post.media.length > X_MEDIA_MAX) {
    const remove = post.media.length - X_MEDIA_MAX;
    issues.push({
      title: "Too much media for X",
      fix: `X shows up to ${X_MEDIA_MAX} items. Remove ${remove}, or turn off X.`,
    });
  }

  if (xOn) {
    for (const item of post.media) {
      if (item.kind === "video" && (item.durationSeconds ?? 0) > X_VIDEO_MAX_SECONDS) {
        const name = mediaDisplayName(item.pathname);
        issues.push({
          title: "Video is too long for X",
          fix: `"${name}" runs ${formatDuration(item.durationSeconds ?? 0)}; X allows ${formatDuration(X_VIDEO_MAX_SECONDS)}. Trim it or turn off X.`,
        });
        break;
      }
    }
  }

  const igType = inferInstagramPostType(post.media);
  if (igOn && igType === "single_video") {
    const video = post.media[0];
    if (video && (video.durationSeconds ?? 0) > IG_REEL_MAX_SECONDS) {
      issues.push({
        title: "Video is too long for a Reel",
        fix: `This video runs ${formatDuration(video.durationSeconds ?? 0)}; Instagram Reels allow ${formatDuration(IG_REEL_MAX_SECONDS)}. Trim it in the video clipper.`,
      });
    }
  }

  if (igOn && post.media.length > IG_CAROUSEL_MAX) {
    const remove = post.media.length - IG_CAROUSEL_MAX;
    issues.push({
      title: "Too many slides",
      fix: `Instagram carousels allow ${IG_CAROUSEL_MAX} items. Remove ${remove}.`,
    });
  }

  if (igOn) {
    const len = post.instagram.caption.length;
    if (len > IG_CAPTION_MAX) {
      const over = len - IG_CAPTION_MAX;
      issues.push({
        title: "Caption is too long",
        fix: `${len} characters, ${over} over Instagram's ${IG_CAPTION_MAX} limit.`,
      });
    }
    const tags = countHashtags(post.instagram.caption);
    if (tags > IG_HASHTAG_MAX) {
      issues.push({
        title: "Too many hashtags",
        fix: `${tags} hashtags; Instagram allows ${IG_HASHTAG_MAX}. Remove some from the caption.`,
      });
    }
  }

  if (issues.length === 0) return { ok: true };
  return { ok: false, issues };
}
