"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Play, Volume2, VolumeX } from "lucide-react";
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
  /** Muted looped feed playback with tap to pause / play (Instagram Reel–style). */
  reelAutoplay?: boolean;
};

type FeedVideoProps = {
  item: SocialMediaItem;
  className?: string;
  style?: React.CSSProperties;
  videoStart: number;
  objectFit: "cover" | "contain";
};

function FeedVideo({ item, className, style, videoStart, objectFit }: FeedVideoProps) {
  const [broken, setBroken] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }, []);

  const toggleAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setAudioMuted(next);
    if (!next && video.paused) void video.play().catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const startAtCover = () => {
      const t = Math.max(0, videoStart);
      const beginPlayback = () => {
        void video.play().catch(() => {});
      };

      if (t <= 0) {
        beginPlayback();
        return;
      }

      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        beginPlayback();
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = Math.min(t, video.duration || t);
      } catch {
        beginPlayback();
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startAtCover();
      return;
    }
    video.addEventListener("loadeddata", startAtCover, { once: true });
    return () => video.removeEventListener("loadeddata", startAtCover);
  }, [item.url, videoStart]);

  if (broken) return <MediaPlaceholder />;

  const shellClass = cn("absolute inset-0 h-full w-full cursor-pointer bg-black", className);
  const videoClass = cn("h-full w-full bg-black", objectFit === "cover" ? "object-cover" : "object-contain");

  return (
    <div
      className={shellClass}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={playing ? "Pause video" : "Play video"}
      onClick={togglePlayback}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          togglePlayback();
        }
      }}
    >
      <video
        ref={videoRef}
        src={item.url}
        className={videoClass}
        playsInline
        muted={audioMuted}
        loop
        autoPlay
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setBroken(true)}
      />
      {!playing ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="flex size-16 items-center justify-center rounded-full bg-black/50">
            <Play className="size-8 fill-white text-white" aria-hidden />
          </span>
        </div>
      ) : null}
      <button
        type="button"
        className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/75"
        aria-label={audioMuted ? "Unmute video" : "Mute video"}
        onClick={toggleAudio}
      >
        {audioMuted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

export function PreviewMedia({
  item,
  className,
  style,
  videoStart = 0,
  objectFit = "cover",
  reelAutoplay = false,
}: PreviewMediaProps) {
  const [broken, setBroken] = useState(false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (broken) return <MediaPlaceholder />;

  if (item.kind === "video") {
    const shellClass = cn(
      "absolute inset-0 h-full w-full bg-black",
      !reelAutoplay && className,
    );

    if (!mounted) {
      return <div className={cn(shellClass, className)} style={style} aria-hidden />;
    }

    if (reelAutoplay) {
      return <FeedVideo key={item.url} item={item} className={className} style={style} videoStart={videoStart} objectFit={objectFit} />;
    }

    return (
      <video
        key={item.url}
        src={item.url}
        className={cn(
          "h-full w-full bg-black",
          objectFit === "cover" ? "object-cover" : "object-contain",
          className ?? "absolute inset-0 h-full w-full",
        )}
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
