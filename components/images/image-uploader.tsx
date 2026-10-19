"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { Check, Copy, ExternalLink, ImageIcon, RefreshCw, RotateCcw, Sheet, Trash2, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "@/hooks/use-copy";
import { MAX_LABEL_LENGTH, normalizeLabel } from "@/lib/asset-labels";
import type { StoredImage } from "@/lib/blob";
import {
  checkImageFile,
  formatBytes,
  IMAGE_ACCEPT,
  IMAGE_TYPES_LABEL,
  imageDisplayName,
  imageUploadPathname,
  isHeic,
  MAX_IMAGE_BYTES,
  newImageId,
  runWithConcurrency,
} from "@/lib/images";
import { sheetText } from "@/lib/sheet-format";
import { cn } from "@/lib/utils";

type PendingUpload = {
  id: string;
  file: File;
  pathname: string;
  contentType: string;
  previewUrl: string;
  status: "queued" | "uploading" | "error";
  pct: number;
  label: string;
  error?: string;
};

type Library = { images: StoredImage[]; hasMore: boolean };

const UPLOAD_CONCURRENCY = 3;
const LABEL_PLACEHOLDER = "Label, e.g. Title slide or Photography/NYT/Selects/…/_DSC0457.jpg";

const CARD = "gap-0 py-0";
const CARD_HEADER = "pt-6 pb-0";
const CARD_CONTENT = "pb-6 pt-4 space-y-4";

export function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aborts = useRef(new Map<string, AbortController>());
  const pendingRef = useRef<PendingUpload[]>([]);

  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<StoredImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { copiedKey, copy } = useCopy();

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    const controllers = aborts.current;
    return () => {
      controllers.forEach((c) => c.abort());
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const applyLibrary = useCallback((result: Library | Error) => {
    if (result instanceof Error) {
      setLibraryError(result.message);
      return;
    }
    // Keep images uploaded in this session that a stale list response doesn't include yet.
    setLibrary((prev) => {
      const listed = new Set(result.images.map((i) => i.pathname));
      const recent = prev?.images.filter((i) => !listed.has(i.pathname) && Date.now() - Date.parse(i.uploadedAt) < 60_000) ?? [];
      return { ...result, images: [...recent, ...result.images] };
    });
    setLibraryError(null);
  }, []);

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
    applyLibrary(await requestLibrary());
    setRefreshing(false);
  };

  const updatePending = useCallback((id: string, patch: Partial<PendingUpload>) => {
    setPending((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const updateImage = useCallback((pathname: string, patch: Partial<StoredImage>) => {
    setLibrary((prev) => prev && { ...prev, images: prev.images.map((i) => (i.pathname === pathname ? { ...i, ...patch } : i)) });
  }, []);

  const saveLabel = useCallback(
    async (image: Pick<StoredImage, "pathname" | "label">, raw: string) => {
      const label = normalizeLabel(raw);
      if (label === (image.label ?? "")) return;
      updateImage(image.pathname, { label: label || null });
      const result = await putLabel(image.pathname, label);
      if (result instanceof Error) {
        updateImage(image.pathname, { label: image.label });
        toast.error(result.message);
      } else updateImage(image.pathname, { label: result });
    },
    [updateImage],
  );

  /** Resolves to the stored image on success, or null if it failed or was cancelled. */
  const uploadItem = useCallback(
    async (item: PendingUpload): Promise<StoredImage | null> => {
      const abort = aborts.current.get(item.id);
      if (!abort || abort.signal.aborted) return null;
      updatePending(item.id, { status: "uploading", pct: 0, error: undefined });
      try {
        const blob = await uploadToBlob(item.pathname, item.file, {
          access: "public",
          handleUploadUrl: "/api/images/upload",
          contentType: item.contentType,
          abortSignal: abort.signal,
          onUploadProgress: ({ percentage }) => updatePending(item.id, { pct: percentage }),
        });
        const image: StoredImage = {
          url: blob.url,
          pathname: blob.pathname,
          name: imageDisplayName(blob.pathname),
          label: null,
          size: item.file.size,
          uploadedAt: new Date().toISOString(),
        };
        const label = pendingRef.current.find((p) => p.id === item.id)?.label ?? item.label;
        URL.revokeObjectURL(item.previewUrl);
        setPending((prev) => prev.filter((p) => p.id !== item.id));
        setLibrary((prev) => ({
          images: [image, ...(prev?.images.filter((i) => i.pathname !== image.pathname) ?? [])],
          hasMore: prev?.hasMore ?? false,
        }));
        if (normalizeLabel(label)) await saveLabel(image, label);
        return image;
      } catch (e) {
        if (!abort.signal.aborted) {
          updatePending(item.id, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
        }
        return null;
      } finally {
        if (aborts.current.get(item.id) === abort) aborts.current.delete(item.id);
      }
    },
    [updatePending, saveLabel],
  );

  /** Uploads a batch, then selects it in the order the files were picked so it copies as one post. */
  const uploadAll = useCallback(
    async (batch: PendingUpload[]) => {
      for (const item of batch) aborts.current.set(item.id, new AbortController());
      const done = new Map<string, string>();
      await runWithConcurrency(batch, UPLOAD_CONCURRENCY, async (item) => {
        const image = await uploadItem(item);
        if (image) done.set(item.id, image.pathname);
      });
      const uploaded = batch.flatMap((item) => done.get(item.id) ?? []);
      if (uploaded.length) setSelected(uploaded);
    },
    [uploadItem],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const accepted: PendingUpload[] = [];
      const rejected: string[] = [];
      for (const file of files) {
        const check = checkImageFile(file);
        if ("error" in check) {
          rejected.push(check.error);
          continue;
        }
        const id = newImageId();
        accepted.push({
          id,
          file,
          pathname: imageUploadPathname(id, file.name, check.contentType),
          contentType: check.contentType,
          previewUrl: URL.createObjectURL(file),
          status: "queued",
          pct: 0,
          label: "",
        });
      }
      if (rejected.length === 1) toast.error(rejected[0]);
      else if (rejected.length > 1) {
        toast.error(`${rejected.length} files skipped`, { description: rejected.join("\n") });
      }
      if (!accepted.length) return;
      setPending((prev) => [...prev, ...accepted]);
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

  const removePending = (item: PendingUpload) => {
    aborts.current.get(item.id)?.abort();
    aborts.current.delete(item.id);
    URL.revokeObjectURL(item.previewUrl);
    setPending((prev) => prev.filter((i) => i.id !== item.id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
  };

  const toggleSelected = (pathname: string, on: boolean) => {
    setSelected((prev) => (on ? [...prev.filter((p) => p !== pathname), pathname] : prev.filter((p) => p !== pathname)));
  };

  const imagesByPathname = new Map(library?.images.map((i) => [i.pathname, i]) ?? []);
  const selectedImages = selected.flatMap((p) => imagesByPathname.get(p) ?? []);
  const count = selectedImages.length;

  const copySelectedForSheet = () => {
    const text = sheetText(selectedImages.map((i) => ({ url: i.url, label: i.label })));
    void copy("sheet", text, `Copied ${count} line${count === 1 ? "" : "s"} for the sheet.`, { sheetCell: true });
  };

  const copySelectedLinks = () => {
    void copy("links", selectedImages.map((i) => i.url).join("\n"), `Copied ${count} link${count === 1 ? "" : "s"}.`);
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
      setSelected((prev) => prev.filter((p) => p !== image.pathname));
      toast.success(`Deleted ${image.name}.`, { description: "Cached copies can take up to a minute to clear." });
      setPendingDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const inFlight = pending.filter((item) => item.status !== "error").length;

  return (
    <div className="space-y-6 lg:max-w-5xl">
      <Card className={CARD}>
        <CardHeader className={CARD_HEADER}>
          <CardTitle>Upload</CardTitle>
          <CardDescription>
            Each image gets a public link you can send to anyone. {IMAGE_TYPES_LABEL}, up to{" "}
            {MAX_IMAGE_BYTES / 1024 / 1024} MB each. Add a label (where it came from, or what it&apos;s for) to
            include it when you copy for the sheet.
          </CardDescription>
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

          {pending.length ? (
            <div className="space-y-2">
              {inFlight ? (
                <p className="text-xs text-muted-foreground">
                  Uploading {inFlight} image{inFlight === 1 ? "" : "s"}…
                </p>
              ) : null}
              <ul className="space-y-2">
                {pending.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-lg border p-2">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Thumb src={item.previewUrl} name={item.file.name} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <Input
                        value={item.label}
                        maxLength={MAX_LABEL_LENGTH}
                        placeholder={LABEL_PLACEHOLDER}
                        aria-label={`Label for ${item.file.name}`}
                        className="h-8 text-xs"
                        onChange={(e) => updatePending(item.id, { label: e.target.value })}
                      />
                      <PendingStatus item={item} />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {item.status === "error" ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => void uploadAll([item])}>
                          <RotateCcw />
                          Retry
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Cancel ${item.file.name}`}
                        onClick={() => removePending(item)}
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
              ? `${library.images.length}${library.hasMore ? "+" : ""} image${library.images.length === 1 ? "" : "s"}, newest first. Select the ones for a post, then copy them as lines for the content calendar.`
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
          {library?.images.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2">
              <Button type="button" size="sm" disabled={!count} onClick={copySelectedForSheet}>
                {copiedKey === "sheet" ? <Check /> : <Sheet />}
                Copy for sheet{count ? ` (${count})` : ""}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!count} onClick={copySelectedLinks}>
                {copiedKey === "links" ? <Check /> : <Copy />}
                Copy links only
              </Button>
              {count ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
                  Clear selection
                </Button>
              ) : (
                <span className="px-1 text-xs text-muted-foreground">Select images to copy them together.</span>
              )}
            </div>
          ) : null}
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
              {library.images.map((image) => {
                const isSelected = selected.includes(image.pathname);
                return (
                  <li
                    key={image.pathname}
                    className={cn("overflow-hidden rounded-lg border", isSelected && "border-primary ring-1 ring-primary")}
                  >
                    <div className="relative aspect-[4/3] bg-muted">
                      <a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${image.name}`}>
                        <Thumb
                          src={image.url}
                          name={image.name}
                          optimize
                          sizes="(min-width: 1280px) 240px, (min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        />
                      </a>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleSelected(image.pathname, checked === true)}
                        aria-label={`Select ${image.name}`}
                        className="absolute top-2 left-2 size-5 bg-background shadow-sm"
                      />
                    </div>
                    <div className="space-y-2 p-3">
                      <LabelInput
                        key={image.label ?? ""}
                        value={image.label ?? ""}
                        ariaLabel={`Label for ${image.name}`}
                        onCommit={(label) => void saveLabel(image, label)}
                      />
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
                        <Button type="button" variant="ghost" size="icon-sm" asChild>
                          <a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${image.name} in a new tab`}>
                            <ExternalLink />
                          </a>
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
                );
              })}
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

/** Saves on blur or Enter; remounted via `key` when the stored label changes. */
function LabelInput({ value, ariaLabel, onCommit }: { value: string; ariaLabel: string; onCommit: (label: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <Input
      value={draft}
      maxLength={MAX_LABEL_LENGTH}
      placeholder={LABEL_PLACEHOLDER}
      aria-label={ariaLabel}
      title={draft || undefined}
      className="h-8 text-xs"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(value);
      }}
    />
  );
}

function PendingStatus({ item }: { item: PendingUpload }) {
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
  return (
    <p className="truncate text-xs text-destructive" title={item.error}>
      {size} · {item.error}
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

async function putLabel(pathname: string, label: string): Promise<string | null | Error> {
  try {
    const res = await fetch("/api/labels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname, label }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return new Error(data.error || "Couldn't save the label.");
    return (data.label as string | null) ?? null;
  } catch {
    return new Error("Couldn't save the label.");
  }
}

function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
