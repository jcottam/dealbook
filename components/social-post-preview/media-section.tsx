"use client";

import { useRef, useState } from "react";
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
import { checkPreviewUploadFile } from "@/lib/social-post-preview/media-preview";
import type { SocialMediaItem } from "@/lib/social-post-preview/types";
import { checkImageFile, imageUploadPathname, newImageId } from "@/lib/images";
import { checkClipFile, clipUploadPathname } from "@/lib/clips";
import { MAX_CLIP_UPLOAD_BYTES } from "@/lib/clips";

type Props = {
  media: SocialMediaItem[];
  onChange: (media: SocialMediaItem[]) => void;
};

export function MediaSection({ media, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const type = inferInstagramPostType(media);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...media];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  const remove = (index: number) => onChange(media.filter((_, i) => i !== index));

  const mergeMedia = (incoming: SocialMediaItem[]) => {
    const byPath = new Map(media.map((m) => [m.pathname, m]));
    for (const item of incoming) byPath.set(item.pathname, item);
    onChange([...byPath.values()]);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of [...files]) {
      const previewCheck = checkPreviewUploadFile(file);
      if (!previewCheck.ok) {
        toast.error(previewCheck.error);
        continue;
      }
      try {
        if (previewCheck.kind === "image") {
          const imgCheck = checkImageFile(file);
          if ("error" in imgCheck) {
            toast.error(imgCheck.error);
            continue;
          }
          const id = newImageId();
          const pathname = imageUploadPathname(id, file.name, imgCheck.contentType);
          const blob = await uploadToBlob(pathname, file, {
            access: "public",
            handleUploadUrl: "/api/images/upload",
            contentType: imgCheck.contentType,
          });
          const measured = await measureImageFile(file);
          mergeMedia([buildMediaItem(blob.pathname, blob.url, "image", measured)]);
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
          mergeMedia([buildMediaItem(blob.pathname, blob.url, "video", measured)]);
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
        {media.map((item, i) => (
          <li key={item.pathname} className="flex items-center gap-2 rounded-md border p-2">
            <GripVertical className="size-4 shrink-0 text-muted-foreground" />
            <div className="size-12 shrink-0 overflow-hidden rounded bg-muted">
              {item.kind === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- blob thumbnail
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <p className="min-w-0 flex-1 truncate text-xs">{item.pathname}</p>
            <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Move up">
              <ArrowUp className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Move down">
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove">
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {inferredTypeLabel(type)} · {media.length} item{media.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
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
            const map = new Map(media.map((m) => [m.pathname, m]));
            for (const item of items) {
              if (!map.has(item.pathname)) map.set(item.pathname, item);
            }
            onChange([...map.values()]);
          }}
        />
      ) : null}
    </div>
  );
}
