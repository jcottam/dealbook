import type { InstagramPostType, SocialMediaItem } from "@/lib/social-post-preview/types";

export function inferInstagramPostType(media: SocialMediaItem[]): InstagramPostType {
  if (media.length <= 1) {
    if (media.length === 0) return "single_image";
    return media[0].kind === "video" ? "single_video" : "single_image";
  }
  return "carousel";
}

export function inferredTypeLabel(type: InstagramPostType): string {
  switch (type) {
    case "single_image":
      return "Single image";
    case "single_video":
      return "Single video (Reel)";
    case "carousel":
      return "Carousel";
  }
}
