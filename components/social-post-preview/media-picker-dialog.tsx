"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StoredClip, StoredImage } from "@/lib/blob";
import { HEIC_PICKER_NOTE, isHeicPathname, isPreviewableImagePathname } from "@/lib/social-post-preview/media-preview";
import { measureVideoUrl } from "@/lib/social-post-preview/measure-media";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  selectedPathnames: Set<string>;
  onConfirm: (items: SocialMediaItem[]) => void;
};

type Tab = "images" | "clips";

function formatDuration(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MediaPickerDialog({ onClose, selectedPathnames, onConfirm }: Props) {
  const [tab, setTab] = useState<Tab>("images");
  const [images, setImages] = useState<StoredImage[]>([]);
  const [clips, setClips] = useState<StoredClip[]>([]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(selectedPathnames));
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/images").then((r) => r.json()),
      fetch("/api/clips").then((r) => r.json()),
    ])
      .then(([img, cl]) => {
        if (!active) return;
        setImages(img.images ?? []);
        setClips(cl.clips ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggle = (pathname: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(pathname)) next.delete(pathname);
      else next.add(pathname);
      return next;
    });
  };

  const probeClip = useCallback((clip: StoredClip) => {
    if (durations[clip.pathname]) return;
    measureVideoUrl(clip.url)
      .then((m) => setDurations((d) => ({ ...d, [clip.pathname]: m.durationSeconds ?? 0 })))
      .catch(() => {});
  }, [durations]);

  const buildItems = (): SocialMediaItem[] => {
    const map = new Map<string, SocialMediaItem>();
    for (const img of images) {
      if (!picked.has(img.pathname) || !isPreviewableImagePathname(img.pathname)) continue;
      map.set(img.pathname, {
        pathname: img.pathname,
        url: img.url,
        kind: "image",
        width: 1200,
        height: 1200,
      });
    }
    for (const clip of clips) {
      if (!picked.has(clip.pathname)) continue;
      const dur = durations[clip.pathname];
      map.set(clip.pathname, {
        pathname: clip.pathname,
        url: clip.url,
        kind: "video",
        width: 1920,
        height: 1080,
        durationSeconds: dur,
      });
    }
    return [...picked].map((p) => map.get(p)).filter((m): m is SocialMediaItem => m != null);
  };

  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle>Choose from uploads</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="flex gap-2 border-b pb-2">
          <Button type="button" variant={tab === "images" ? "default" : "outline"} size="sm" onClick={() => setTab("images")}>
            Images
          </Button>
          <Button type="button" variant={tab === "clips" ? "default" : "outline"} size="sm" onClick={() => setTab("clips")}>
            Clips
          </Button>
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {tab === "images"
            ? images.map((img) => {
                const heic = isHeicPathname(img.pathname);
                const disabled = heic || !isPreviewableImagePathname(img.pathname);
                return (
                  <button
                    key={img.pathname}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && toggle(img.pathname)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-2 text-left text-sm",
                      picked.has(img.pathname) && "border-primary bg-primary/5",
                      disabled && "opacity-50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails from Blob */}
                    <img src={img.url} alt="" className="size-12 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{img.label || img.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{img.pathname}</p>
                      {heic ? <p className="text-xs text-amber-700">{HEIC_PICKER_NOTE}</p> : null}
                    </div>
                  </button>
                );
              })
            : clips.map((clip) => {
                probeClip(clip);
                return (
                  <button
                    key={clip.pathname}
                    type="button"
                    onClick={() => toggle(clip.pathname)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-2 text-left text-sm",
                      picked.has(clip.pathname) && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex size-12 items-center justify-center rounded bg-muted text-xs">MP4</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{clip.label || clip.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{clip.pathname}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(durations[clip.pathname])}</p>
                    </div>
                  </button>
                );
              })}
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(buildItems());
              onClose();
            }}
          >
            Add selected
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
