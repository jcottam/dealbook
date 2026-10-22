"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SEEK_SECONDS = 0.1;

type Props = {
  url: string;
  /** Frame to show; defaults to just past the start (a frame at exactly 0 is often black). */
  seconds?: number;
  className?: string;
};

/** Paused still-frame preview for MP4 clip rows (picker, lists). */
export function ClipThumbnail({ url, seconds, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const at = seconds && seconds > 0 ? seconds : SEEK_SECONDS;

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
      // iOS Safari won't paint a frame for preload="metadata" unless the URL has a media fragment.
      src={`${url}#t=${at}`}
      muted
      playsInline
      preload="metadata"
      aria-hidden
      className={cn("size-12 shrink-0 rounded object-cover bg-black", className)}
      onLoadedMetadata={() => {
        const video = videoRef.current;
        if (!video) return;
        const pauseAtFrame = () => {
          video.pause();
        };
        video.addEventListener("seeked", pauseAtFrame, { once: true });
        try {
          video.currentTime = Math.min(at, video.duration || at);
        } catch {
          pauseAtFrame();
        }
      }}
      onError={() => setFailed(true)}
    />
  );
}
