"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { Check, Copy, ExternalLink, ImageIcon, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoredImage } from "@/lib/blob";
import {
  checkImageFile,
  formatBytes,
  IMAGE_ACCEPT,
  IMAGE_TYPES_LABEL,
  imageUploadPathname,
  isHeic,
  MAX_IMAGE_BYTES,
  runWithConcurrency,
} from "@/lib/images";
import { cn } from "@/lib/utils";

type UploadItem = {
  id: string;
  file: File;
  contentType: string;
  previewUrl: string;
  status: "queued" | "uploading" | "done" | "error";
  pct: number;
  url?: string;
  error?: string;
};

type Library = { images: StoredImage[]; hasMore: boolean };

const UPLOAD_CONCURRENCY = 3;
const COPIED_FEEDBACK_MS = 1500;

const CARD = "gap-0 py-0";
const CARD_HEADER = "pt-6 pb-0";
const CARD_CONTENT = "pb-6 pt-4 space-y-4";

export function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aborts = useRef(new Map<string, AbortController>());
  const itemsRef = useRef<UploadItem[]>([]);

  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StoredImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { copiedKey, copy } = useCopy();

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const controllers = aborts.current;
    return () => {
      controllers.forEach((c) => c.abort());
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const applyLibrary = useCallback((result: Library | Error) => {
    if (result instanceof Error) {
      setLibraryError(result.message);
      return;
    }
    setLibrary(result);
    setLibraryError(null);
  }, []);

  const fetchLibrary = useCallback(async () => applyLibrary(await requestLibrary()), [applyLibrary]);

  useEffect(() => {
    let cancelled = false;
    requestLibrary().then((result) => {
      if (!cancelled) applyLibrary(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyLibrary]);

  const refreshLibrary = async () => {
    setRefreshing(true);
    await fetchLibrary();
    setRefreshing(false);
  };

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const uploadItem = useCallback(
    async (item: UploadItem) => {
      const abort = aborts.current.get(item.id);
      if (!abort || abort.signal.aborted) return;
      updateItem(item.id, { status: "uploading", pct: 0, error: undefined });
      try {
        const blob = await uploadToBlob(imageUploadPathname(item.file.name, item.contentType), item.file, {
          access: "public",
          handleUploadUrl: "/api/images/upload",
          contentType: item.contentType,
          abortSignal: abort.signal,
          onUploadProgress: ({ percentage }) => updateItem(item.id, { pct: percentage }),
        });
        updateItem(item.id, { status: "done", pct: 100, url: blob.url });
      } catch (e) {
        if (abort.signal.aborted) return;
        updateItem(item.id, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
      } finally {
        if (aborts.current.get(item.id) === abort) aborts.current.delete(item.id);
      }
    },
    [updateItem],
  );

  const uploadAll = useCallback(
    async (batch: UploadItem[]) => {
      for (const item of batch) aborts.current.set(item.id, new AbortController());
      await runWithConcurrency(batch, UPLOAD_CONCURRENCY, uploadItem);
      void fetchLibrary();
    },
    [uploadItem, fetchLibrary],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const accepted: UploadItem[] = [];
      const rejected: string[] = [];
      for (const file of files) {
        const check = checkImageFile(file);
        if ("error" in check) {
          rejected.push(check.error);
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          file,
          contentType: check.contentType,
          previewUrl: URL.createObjectURL(file),
          status: "queued",
          pct: 0,
        });
      }
      if (rejected.length === 1) toast.error(rejected[0]);
      else if (rejected.length > 1) {
        toast.error(`${rejected.length} files skipped`, { description: rejected.join("\n") });
      }
      if (!accepted.length) return;
      setItems((prev) => [...accepted, ...prev]);
      void uploadAll(accepted);
    },
    [uploadAll],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      event.preventDefault();
      addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const retryItem = (item: UploadItem) => void uploadAll([item]);

  const removeItem = (item: UploadItem) => {
    aborts.current.get(item.id)?.abort();
    aborts.current.delete(item.id);
    URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const clearFinished = () => {
    const keep: UploadItem[] = [];
    for (const item of items) {
      if (item.status === "done" || item.status === "error") URL.revokeObjectURL(item.previewUrl);
      else keep.push(item);
    }
    setItems(keep);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
  };

  const confirmDelete = async () => {
    const image = pendingDelete;
    if (!image) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: image.pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setLibrary((prev) => prev && { ...prev, images: prev.images.filter((i) => i.pathname !== image.pathname) });
      setItems((prev) => prev.filter((i) => i.url !== image.url));
      toast.success(`Deleted ${image.name}.`, { description: "Cached copies can take up to a minute to clear." });
      setPendingDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const doneUrls = items.flatMap((item) => (item.status === "done" && item.url ? [item.url] : []));
  const hasFinished = items.some((item) => item.status === "done" || item.status === "error");
  const inFlight = items.filter((item) => item.status === "queued" || item.status === "uploading").length;

  return (
    <div className="space-y-6 lg:max-w-5xl">
      <Card className={CARD}>
        <CardHeader className={CARD_HEADER}>
          <CardTitle>Upload</CardTitle>
          <CardDescription>
            Each image gets a public link you can send to anyone. {IMAGE_TYPES_LABEL}, up to{" "}
            {MAX_IMAGE_BYTES / 1024 / 1024} MB each.
          </CardDescription>
          {items.length ? (
            <CardAction className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!doneUrls.length}
                onClick={() => copy("all", doneUrls.join("\n"), `Copied ${doneUrls.length} link${doneUrls.length === 1 ? "" : "s"}.`)}
              >
                {copiedKey === "all" ? <Check /> : <Copy />}
                Copy all links{doneUrls.length ? ` (${doneUrls.length})` : ""}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!hasFinished} onClick={clearFinished}>
                Clear
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className={CARD_CONTENT}>
          <div
            className={cn(
              "flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground",
              "hover:bg-muted/50",
              dragging && "border-primary bg-muted/60",
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
          >
            <p>Drag and drop images, or paste a screenshot</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={IMAGE_ACCEPT}
              className="hidden"
              aria-label="Choose images to upload"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </div>

          {items.length ? (
            <div className="space-y-2">
              {inFlight ? (
                <p className="text-xs text-muted-foreground">
                  Uploading {inFlight} image{inFlight === 1 ? "" : "s"}…
                </p>
              ) : null}
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-lg border p-2">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Thumb src={item.previewUrl} name={item.file.name} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <UploadStatus item={item} />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {item.status === "done" && item.url ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copy(item.id, item.url!, "Link copied.")}
                          >
                            {copiedKey === item.id ? <Check /> : <Copy />}
                            Copy link
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" asChild>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.file.name}`}>
                              <ExternalLink />
                            </a>
                          </Button>
                        </>
                      ) : null}
                      {item.status === "error" ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => retryItem(item)}>
                          <RotateCcw />
                          Retry
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={item.status === "done" ? `Hide ${item.file.name}` : `Cancel ${item.file.name}`}
                        onClick={() => removeItem(item)}
                      >
                        <X />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className={CARD_HEADER}>
          <CardTitle>Uploaded images</CardTitle>
          <CardDescription>
            {library
              ? `${library.images.length}${library.hasMore ? "+" : ""} image${library.images.length === 1 ? "" : "s"}, newest first.${library.hasMore ? " Showing the most recent 1,000." : ""}`
              : "Everything uploaded with this tool."}
          </CardDescription>
          <CardAction>
            <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={refreshLibrary}>
              <RefreshCw className={cn(refreshing && "animate-spin")} />
              Refresh
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className={CARD_CONTENT}>
          {libraryError ? <p className="text-sm text-destructive">{libraryError}</p> : null}
          {!library && !libraryError ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full" />
              ))}
            </div>
          ) : null}
          {library && !library.images.length ? (
            <p className="text-sm text-muted-foreground">No images yet. Uploads show up here.</p>
          ) : null}
          {library?.images.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {library.images.map((image) => (
                <li key={image.pathname} className="overflow-hidden rounded-lg border">
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-[4/3] bg-muted"
                    aria-label={`Open ${image.name}`}
                  >
                    <Thumb
                      src={image.url}
                      name={image.name}
                      optimize
                      sizes="(min-width: 1280px) 240px, (min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                    />
                  </a>
                  <div className="space-y-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={image.name}>
                        {image.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(image.size)} · {formatUploadedAt(image.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => copy(image.pathname, image.url, "Link copied.")}
                      >
                        {copiedKey === image.pathname ? <Check /> : <Copy />}
                        Copy link
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${image.name}`}
                        onClick={() => setPendingDelete(image)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The public link stops working for everyone you shared it with. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadStatus({ item }: { item: UploadItem }) {
  const size = formatBytes(item.file.size);
  if (item.status === "queued") return <p className="text-xs text-muted-foreground">{size} · waiting…</p>;
  if (item.status === "uploading") {
    return (
      <>
        <p className="text-xs text-muted-foreground">
          {size} · uploading {Math.floor(item.pct)}%
        </p>
        <Progress value={item.pct} className="h-1" />
      </>
    );
  }
  if (item.status === "error") {
    return (
      <p className="truncate text-xs text-destructive" title={item.error}>
        {size} · {item.error}
      </p>
    );
  }
  return (
    <p className="truncate font-mono text-xs text-muted-foreground" title={item.url}>
      {item.url}
    </p>
  );
}

/**
 * Remote thumbnails go through next/image so the library doesn't download full-size originals.
 * HEIC can't be optimized, so it loads the original: Safari renders it, other browsers fall back to an icon.
 */
function Thumb({ src, name, optimize = false, sizes }: { src: string; name: string; optimize?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
        <ImageIcon className="size-5" />
        <span className="text-[10px] font-medium uppercase">{/\.([^.]+)$/.exec(name)?.[1] ?? "image"}</span>
      </div>
    );
  }
  if (optimize && !isHeic(name)) {
    return <Image src={src} alt={name} fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- object URLs and HEIC originals can't go through the optimizer
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 size-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (key: string, text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
      setCopiedKey(key);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), COPIED_FEEDBACK_MS);
    } catch {
      toast.error("Couldn't copy. Open the image and copy the address instead.");
    }
  }, []);

  return { copiedKey, copy };
}

async function requestLibrary(): Promise<Library | Error> {
  try {
    const res = await fetch("/api/images", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return new Error(data.error || res.statusText);
    return data as Library;
  } catch (e) {
    return e instanceof Error ? e : new Error("Couldn't load images.");
  }
}

function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
