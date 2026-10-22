"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "@/components/social-post-preview/media-picker-dialog";
import { inferredTypeLabel, inferInstagramPostType } from "@/lib/social-post-preview/infer-type";
import {
  buildMediaItem,
  measureImageFile,
  measureVideoFile,
} from "@/lib/social-post-preview/measure-media";
import { compressImageForSocialUpload } from "@/lib/social-post-preview/compress-image";
import { mergeMediaItems, reorderMediaItems } from "@/lib/social-post-preview/merge-media";
import { checkPreviewUploadFile } from "@/lib/social-post-preview/media-preview";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";
import { checkImageFile, imageDisplayName, imageUploadPathname, newImageId } from "@/lib/images";
import { checkClipFile, clipUploadPathname } from "@/lib/clips";
import { MAX_CLIP_UPLOAD_BYTES } from "@/lib/clips";

type Props = {
  media: SocialMediaItem[];
  onChange: (media: SocialMediaItem[]) => void;
};

function formatDuration(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function mediaKindLabel(item: SocialMediaItem): string {
  if (item.kind === "video") {
    const d = formatDuration(item.durationSeconds);
    return d ? `Video · ${d}` : "Video";
  }
  return "Photo";
}

export function MediaSection({ media, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const type = inferInstagramPostType(media);

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= media.length) return;
    onChange(reorderMediaItems(media, index, j));
  };

  const remove = (index: number) => onChange(media.filter((_, i) => i !== index));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let current = media;
    for (const file of [...files]) {
      const previewCheck = checkPreviewUploadFile(file);
      if (!previewCheck.ok) {
        toast.error(previewCheck.error);
        continue;
      }
      try {
        if (previewCheck.kind === "image") {
          const uploadFile = await compressImageForSocialUpload(file);
          const imgCheck = checkImageFile(uploadFile);
          if ("error" in imgCheck) {
            toast.error(imgCheck.error);
            continue;
          }
          const id = newImageId();
          const pathname = imageUploadPathname(id, uploadFile.name, imgCheck.contentType);
          const blob = await uploadToBlob(pathname, uploadFile, {
            access: "public",
            handleUploadUrl: "/api/images/upload",
            contentType: imgCheck.contentType,
          });
          const measured = await measureImageFile(uploadFile);
          current = mergeMediaItems(current, [buildMediaItem(blob.pathname, blob.url, "image", measured)]);
          onChange(current);
        } else {
          const clipCheck = checkClipFile(file);
          if ("error" in clipCheck) {
            toast.error(clipCheck.error);
            continue;
          }
          if (file.size > MAX_CLIP_UPLOAD_BYTES) {
            toast.error("Video is over the 1 GB limit.");
            continue;
          }
          const pathname = clipUploadPathname(file.name);
          const blob = await uploadToBlob(pathname, file, {
            access: "public",
            handleUploadUrl: "/api/clips/upload",
            contentType: clipCheck.contentType,
          });
          const measured = await measureVideoFile(file);
          current = mergeMediaItems(current, [buildMediaItem(blob.pathname, blob.url, "video", measured)]);
          onChange(current);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Media</p>
      <ul className="space-y-2">
        {media.map((item, i) => {
          const name = imageDisplayName(item.pathname);
          return (
            <li
              key={item.pathname}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/15 px-1.5 py-1.5"
              title={item.pathname}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex === null || dragIndex === i) return;
                onChange(reorderMediaItems(media, dragIndex, i));
                setDragIndex(null);
              }}
            >
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 active:cursor-grabbing"
                aria-label="Drag to reorder"
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <GripVertical className="size-4 cursor-grab" aria-hidden />
              </button>
              <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.kind === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" muted />
                ) : (
                  <Image src={item.url} alt="" width={44} height={44} className="size-full object-cover" sizes="44px" />
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium text-foreground">{name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{mediaKindLabel(item)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <div className="flex items-center -space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={i === media.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <Button type="button" variant="ghost" size="icon-xs" onClick={() => remove(i)} aria-label="Remove">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {inferredTypeLabel(type)} · {media.length} item{media.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,video/mp4,.mp4"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>Upload media</Button>
          <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>Choose from uploads</Button>
        </div>
      </div>
      {pickerOpen ? (
        <MediaPickerDialog
          onClose={() => setPickerOpen(false)}
          selectedPathnames={new Set(media.map((m) => m.pathname))}
          onConfirm={(items) => {
            onChange(mergeMediaItems(media, items));
          }}
        />
      ) : null}
    </div>
  );
}
