"use client";

import { useState } from "react";
import { MediaPlaceholder } from "@/components/social-post-preview/mockups/media-placeholder";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";
import { cn } from "@/lib/utils";

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
    // eslint-disable-next-line @next/next/no-img-element -- blob URLs for preview mockups
    <img
      src={item.url}
      alt=""
      className={cn("h-full w-full bg-black", objectFit === "cover" ? "object-cover" : "object-contain", className)}
      style={style}
      onError={() => setBroken(true)}
    />
  );
}
