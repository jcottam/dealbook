"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SEEK_SECONDS = 0.1;

type Props = {
  url: string;
  className?: string;
};

/** Paused first-frame preview for MP4 clip rows (picker, lists). */
export function ClipThumbnail({ url, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground",
          className,
        )}
      >
        MP4
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={url}
      muted
      playsInline
      preload="metadata"
      className={cn("size-12 shrink-0 rounded object-cover bg-black", className)}
      onLoadedMetadata={() => {
        const video = videoRef.current;
        if (!video) return;
        const pauseAtFrame = () => {
          video.pause();
        };
        video.addEventListener("seeked", pauseAtFrame, { once: true });
        try {
          video.currentTime = Math.min(SEEK_SECONDS, video.duration || SEEK_SECONDS);
        } catch {
          pauseAtFrame();
        }
      }}
      onError={() => setFailed(true)}
    />
  );
}
