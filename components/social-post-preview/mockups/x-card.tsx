"use client";

import Image from "next/image";
import { BarChart2, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { PreviewMedia } from "@/components/social-post-preview/mockups/preview-media";
import { FormattedCaption } from "@/lib/social-post-preview/caption-format";
import { xSinglePhotoAspect } from "@/lib/social-post-preview/crop-aspect";
import { X_MEDIA_MAX, X_TEXT_MAX } from "@/lib/social-post-preview/limits";
import type { PublicSocialPost, SocialMediaItem } from "@/lib/social-post-preview/types";
import type { SocialProfile } from "@/lib/social-profile-types";
import { cn } from "@/lib/utils";

type Props = {
  profile: SocialProfile;
  post: PublicSocialPost;
  className?: string;
};

export function XCard({ profile, post, className }: Props) {
  const shown = post.media.slice(0, X_MEDIA_MAX);
  const hidden = post.media.length - shown.length;

  return (
    <article className={cn("mx-auto w-full max-w-[390px] rounded-xl border bg-white p-3 text-black shadow-sm", className)}>
      <header className="mb-2 flex gap-2 text-sm">
        <Image src={profile.avatarSrc} alt="" width={40} height={40} className="size-10 rounded-full border object-cover" sizes="40px" />
        <div className="min-w-0 leading-tight">
          <p className="font-bold">
            {profile.x.displayName}{" "}
            <span className="font-normal text-muted-foreground">(preview)</span>
          </p>
          <p className="text-muted-foreground">@{profile.x.handle} · now</p>
        </div>
      </header>

      <XText text={post.x.text} />

      {shown.length ? <XMediaGrid items={shown} crop={post.x.crop} className="mt-3" /> : null}
      {hidden > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">+{hidden} more not shown on X (max {X_MEDIA_MAX}).</p>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-muted-foreground">
        <MessageCircle className="size-4" />
        <Repeat2 className="size-4" />
        <Heart className="size-4" />
        <BarChart2 className="size-4" />
        <Share className="size-4" />
      </div>
    </article>
  );
}

function XText({ text }: { text: string }) {
  if (text.length <= X_TEXT_MAX) {
    return (
      <p className="whitespace-pre-wrap text-[15px] leading-snug">
        <FormattedCaption text={text} linkClassName="text-sky-600" />
      </p>
    );
  }
  const ok = text.slice(0, X_TEXT_MAX);
  const over = text.slice(X_TEXT_MAX);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-snug">
      <FormattedCaption text={ok} linkClassName="text-sky-600" />
      <span className="bg-red-100 text-red-700">{over}</span>
    </p>
  );
}

function XMediaGrid({
  items,
  crop,
  className,
}: {
  items: SocialMediaItem[];
  crop: PublicSocialPost["x"]["crop"];
  className?: string;
}) {
  if (items.length === 1) {
    const item = items[0];
    const aspect =
      item.kind === "image"
        ? xSinglePhotoAspect(crop, item.width, item.height)
        : Math.min(16 / 9, Math.max(4 / 5, item.width / item.height));
    return (
      <div className={cn("relative overflow-hidden rounded-2xl border", className)} style={{ aspectRatio: `${aspect}` }}>
        <PreviewMedia item={item} className="absolute inset-0" reelAutoplay={item.kind === "video"} />
      </div>
    );
  }

  const gridClass =
    items.length === 2
      ? "grid-cols-2 grid-rows-1"
      : items.length === 3
        ? "grid-cols-2 grid-rows-2 [&>*:first-child]:row-span-2"
        : "grid-cols-2 grid-rows-2";

  return (
    <div className={cn("grid gap-0.5 overflow-hidden rounded-2xl border", gridClass, className)} style={{ minHeight: 200 }}>
      {items.map((item) => (
        <div key={item.pathname} className="relative min-h-[96px] bg-black">
          <PreviewMedia item={item} className="absolute inset-0" reelAutoplay={item.kind === "video"} />
        </div>
      ))}
    </div>
  );
}
