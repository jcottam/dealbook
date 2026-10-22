"use client";

import { useState } from "react";
import Image from "next/image";
import { Bookmark, Heart, MessageCircle, Send } from "lucide-react";
import { MediaPlaceholder } from "@/components/social-post-preview/mockups/media-placeholder";
import { PreviewMedia } from "@/components/social-post-preview/mockups/preview-media";
import { FormattedCaption } from "@/lib/social-post-preview/caption-format";
import { instagramCropAspect, REEL_ASPECT } from "@/lib/social-post-preview/crop-aspect";
import { inferInstagramPostType } from "@/lib/social-post-preview/infer-type";
import { truncateInstagramCaption } from "@/lib/social-post-preview/text-truncate";
import type { PublicSocialPost } from "@/lib/social-post-preview/types";
import type { SocialProfile } from "@/lib/social-profile-types";
import { cn } from "@/lib/utils";

type Props = {
  profile: SocialProfile;
  post: PublicSocialPost;
  className?: string;
};

export function InstagramFeedCard({ profile, post, className }: Props) {
  const type = inferInstagramPostType(post.media);
  const [slide, setSlide] = useState(0);
  const items = post.media;
  const current = items[slide];

  const cropAspect = instagramCropAspect(post.instagram.crop);

  return (
    <article className={cn("mx-auto w-full max-w-[390px] overflow-hidden rounded-lg border bg-white text-black shadow-sm", className)}>
      <header className="flex items-center gap-2 px-3 py-2 text-sm">
        <Image src={profile.avatarSrc} alt="" width={32} height={32} className="size-8 rounded-full border object-cover" sizes="32px" />
        <span className="font-semibold">
          {profile.instagram.handle}{" "}
          <span className="font-normal text-muted-foreground">(preview)</span>
        </span>
      </header>

      <div className="relative w-full bg-black">
        {type === "single_video" && current ? (
          <div className="relative w-full" style={{ aspectRatio: `${REEL_ASPECT}` }}>
            <PreviewMedia
              item={current}
              videoStart={post.instagram.coverSeconds ?? 0}
              reelAutoplay
              className="absolute inset-0"
            />
          </div>
        ) : type === "carousel" && items.length ? (
          <div className="relative w-full" style={{ aspectRatio: `${cropAspect}` }}>
            {current ? (
              <PreviewMedia
                item={current}
                className="absolute inset-0"
                reelAutoplay={current.kind === "video"}
                videoStart={current.kind === "video" ? 0 : undefined}
              />
            ) : (
              <MediaPlaceholder />
            )}
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-xs text-white"
                  onClick={() => setSlide((s) => (s - 1 + items.length) % items.length)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-xs text-white"
                  onClick={() => setSlide((s) => (s + 1) % items.length)}
                >
                  ›
                </button>
                <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  {slide + 1}/{items.length}
                </span>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {items.map((_, i) => (
                    <span key={i} className={cn("size-1.5 rounded-full", i === slide ? "bg-white" : "bg-white/40")} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="relative w-full" style={{ aspectRatio: `${cropAspect}` }}>
            {current ? (
              <PreviewMedia
                item={current}
                className="absolute inset-0"
                reelAutoplay={current.kind === "video"}
                videoStart={current.kind === "video" ? 0 : undefined}
              />
            ) : (
              <MediaPlaceholder />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 px-3 py-2 text-black">
        <Heart className="size-6" />
        <MessageCircle className="size-6" />
        <Send className="size-6" />
        <Bookmark className="ml-auto size-6" />
      </div>

      <div className="px-3 pb-3 text-sm leading-snug">
        <p>
          <span className="font-semibold">{profile.instagram.handle}</span>{" "}
          <CaptionBody caption={post.instagram.caption} />
        </p>
      </div>
    </article>
  );
}

function CaptionBody({ caption }: { caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const { visible, truncated } = truncateInstagramCaption(caption);
  const showMore = truncated && !expanded;

  return (
    <>
      <FormattedCaption text={showMore ? visible : caption} linkClassName="text-sky-700" />
      {showMore ? (
        <button
          type="button"
          className="inline text-muted-foreground hover:underline"
          onClick={() => setExpanded(true)}
        >
          {" "}
          … more
        </button>
      ) : null}
    </>
  );
}
