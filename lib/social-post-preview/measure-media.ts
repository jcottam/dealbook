import type { MediaKind, SocialMediaItem } from "@/lib/social-post-preview/types";

export type MeasuredMedia = {
  width: number;
  height: number;
  durationSeconds?: number;
};

export function measureImageFile(file: File): Promise<MeasuredMedia> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

export function measureVideoFile(file: File): Promise<MeasuredMedia> {
  return measureVideoUrl(URL.createObjectURL(file), true);
}

export function measureVideoUrl(url: string, revoke = false): Promise<MeasuredMedia> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      if (revoke) URL.revokeObjectURL(url);
    };
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : undefined;
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: duration,
      });
      cleanup();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video metadata."));
    };
    video.src = url;
  });
}

export function buildMediaItem(
  pathname: string,
  url: string,
  kind: MediaKind,
  measured: MeasuredMedia,
): SocialMediaItem {
  return {
    pathname,
    url,
    kind,
    width: measured.width,
    height: measured.height,
    durationSeconds: measured.durationSeconds,
  };
}
