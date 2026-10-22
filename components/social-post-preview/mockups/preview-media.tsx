"use client";

import { useState } from "react";
import Image from "next/image";
import { MediaPlaceholder } from "@/components/social-post-preview/mockups/media-placeholder";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";
import { cn } from "@/lib/utils";

/** Display width for mockups (~phone); `next/image` serves smaller optimized variants. */
const MOCKUP_IMAGE_SIZES = "(max-width: 512px) 100vw, 512px";

type PreviewMediaProps = {
  item: SocialMediaItem;
  className?: string;
  style?: React.CSSProperties;
  videoStart?: number;
  objectFit?: "cover" | "contain";
};

export function PreviewMedia({ item, className, style, videoStart = 0, objectFit = "cover" }: PreviewMediaProps) {
  const [broken, setBroken] = useState(false);
  if (broken) return <MediaPlaceholder />;

  if (item.kind === "video") {
    return (
      <video
        key={item.url}
        src={`${item.url}#t=${videoStart}`}
        className={cn("h-full w-full bg-black", objectFit === "cover" ? "object-cover" : "object-contain", className)}
        style={style}
        playsInline
        muted
        preload="metadata"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className={cn("relative size-full min-h-0 bg-black", className)} style={style}>
      <Image
        src={item.url}
        alt=""
        fill
        sizes={MOCKUP_IMAGE_SIZES}
        className={objectFit === "cover" ? "object-cover" : "object-contain"}
        onError={() => setBroken(true)}
      />
    </div>
  );
}
