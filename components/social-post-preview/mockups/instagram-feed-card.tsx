"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, Send } from "lucide-react";
import { MediaPlaceholder } from "@/components/social-post-preview/mockups/media-placeholder";
import { PreviewMedia } from "@/components/social-post-preview/mockups/preview-media";
import { FormattedCaption } from "@/lib/social-post-preview/caption-format";
import { instagramCropAspect, REEL_ASPECT } from "@/lib/social-post-preview/crop-aspect";
import { inferInstagramPostType } from "@/lib/social-post-preview/infer-type";
import { truncateInstagramCaption } from "@/lib/social-post-preview/text-truncate";
import type { PublicSocialPost, SocialMediaItem } from "@/lib/social-post-preview/types";
import type { SocialProfile } from "@/lib/social-profile-types";
import { cn } from "@/lib/utils";

type Props = {
  profile: SocialProfile;
  post: PublicSocialPost;
  className?: string;
};

export function InstagramFeedCard({ profile, post, className }: Props) {
  const type = inferInstagramPostType(post.media);
  const items = post.media;
  const current = items[0];

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
          <InstagramCarousel items={items} aspect={cropAspect} />
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

/**
 * Native horizontal scroll-snap track: touch swipes and trackpad gestures move between slides while
 * vertical pans still scroll the page. Arrows and dots drive the same track via `scrollTo`.
 */
function InstagramCarousel({ items, aspect }: { items: SocialMediaItem[]; aspect: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const count = items.length;
  const active = Math.min(slide, count - 1);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setSlide(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }, []);

  return (
    <div className="relative w-full" style={{ aspectRatio: `${aspect}` }}>
      <div
        ref={trackRef}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={onScroll}
        aria-roledescription="carousel"
      >
        {items.map((item, i) => (
          <div
            key={`${item.pathname}-${i}`}
            className="relative h-full w-full shrink-0 snap-center snap-always"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== active}
          >
            <PreviewMedia
              item={item}
              className="absolute inset-0"
              reelAutoplay={item.kind === "video" && i === active}
              videoStart={item.kind === "video" ? 0 : undefined}
            />
          </div>
        ))}
      </div>
      {count > 1 ? (
        <>
          {active > 0 ? (
            <button
              type="button"
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => goTo(active - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          ) : null}
          {active < count - 1 ? (
            <button
              type="button"
              aria-label="Next slide"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => goTo(active + 1)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          ) : null}
          <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white tabular-nums">
            {active + 1}/{count}
          </span>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === active}
                className={cn("size-1.5 rounded-full transition-colors", i === active ? "bg-white" : "bg-white/40")}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
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
