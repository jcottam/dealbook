export type Platform = "instagram" | "x";

export type InstagramCrop = "1:1" | "4:5" | "1.91:1";
export type XCrop = "original" | "wide" | "square";

export type MediaKind = "image" | "video";

export type SocialMediaItem = {
  pathname: string;
  url: string;
  kind: MediaKind;
  width: number;
  height: number;
  durationSeconds?: number;
};

export type InstagramFields = {
  caption: string;
  crop: InstagramCrop;
  coverSeconds?: number;
};

export type XFields = {
  text: string;
  crop: XCrop;
};

export type SocialPost = {
  id: string;
  name: string;
  profileId: string;
  platforms: Platform[];
  media: SocialMediaItem[];
  instagram: InstagramFields;
  x: XFields;
  createdAt: string;
  updatedAt: string;
};

/** Share page and mockups — no internal name. */
export type PublicSocialPost = Omit<SocialPost, "name">;

export type InstagramPostType = "single_image" | "single_video" | "carousel";

export type PreviewShareIssue = { title: string; fix: string };

export type PreviewShareValidation = { ok: true } | { ok: false; issues: PreviewShareIssue[] };

export type PreviewPostSummary = {
  id: string;
  name: string;
  platforms: Platform[];
  instagramType: InstagramPostType;
  thumbnailUrl: string | null;
  updatedAt: string;
};

export type PreviewComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};
