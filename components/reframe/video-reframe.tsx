"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { uploadPresigned as uploadToBlob } from "@vercel/blob/client";
import { toast } from "sonner";
import { ReframeCropPreview } from "@/components/reframe/reframe-crop-preview";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCopy } from "@/hooks/use-copy";
import { MAX_LABEL_LENGTH, normalizeLabel } from "@/lib/asset-labels";
import { blobDownloadUrl } from "@/lib/blob-download-url";
import { parsePresignedMeta } from "@/lib/clip-url";
import { DEFAULT_REFRAME_FOCUS, type ReframeFocus } from "@/lib/media/reframe-crop";
import { formatSeconds, formatTimecodeHmsMs, MAX_CLIP_SECONDS, parseTimeToSeconds } from "@/lib/timecode";
import { formatTimecodeRange, sheetLine } from "@/lib/sheet-format";
import { cn } from "@/lib/utils";

type SourceKind = "url" | "file";
type ExportedReframe = {
  url: string;
  pathname: string;
  filename: string;
  bytes: number;
  label: string | null;
  range: { start: number; end: number };
};
type UploadState = { status: "uploading"; pct: number } | { status: "done" } | { status: "error"; message: string };
type PendingUpload = { file: File; promise: Promise<string>; abort: AbortController };

const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;
const CARD = "gap-0 py-0";
const CARD_HEADER = "pt-6 pb-0";
const CARD_CONTENT = "pb-6 pt-4 space-y-4";

export function VideoReframe() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urlInput, setUrlInput] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState("0:00");
  const [endTime, setEndTime] = useState("0:30");
  const [focus, setFocus] = useState<ReframeFocus>(DEFAULT_REFRAME_FOCUS);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [lastExport, setLastExport] = useState<ExportedReframe | null>(null);
  const { copiedKey, copy } = useCopy();
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const uploadRef = useRef<PendingUpload | null>(null);

  const hasActiveSource = previewSrc != null && sourceKind != null;

  const startUpload = useCallback((f: File) => {
    uploadRef.current?.abort.abort();
    const abort = new AbortController();
    const isCurrent = () => uploadRef.current?.abort === abort;
    setUploadState({ status: "uploading", pct: 0 });
    const promise = uploadToBlob(`uploads/${f.name.replace(/[^\w.-]+/g, "_") || "video"}`, f, {
      access: "private",
      handleUploadUrl: "/api/upload",
      contentType: f.type,
      multipart: f.size > MULTIPART_THRESHOLD_BYTES,
      abortSignal: abort.signal,
      onUploadProgress: ({ percentage }) => {
        if (isCurrent()) setUploadState({ status: "uploading", pct: percentage });
      },
    }).then(
      (blob) => {
        if (isCurrent()) setUploadState({ status: "done" });
        return blob.pathname;
      },
      (err: unknown) => {
        if (isCurrent()) {
          uploadRef.current = null;
          setUploadState({ status: "error", message: err instanceof Error ? err.message : "Upload failed" });
        }
        throw err;
      },
    );
    promise.catch(() => {});
    uploadRef.current = { file: f, promise, abort };
    return promise;
  }, []);

  const cancelUpload = useCallback(() => {
    uploadRef.current?.abort.abort();
    uploadRef.current = null;
    setUploadState(null);
  }, []);

  const resetSource = useCallback(() => {
    setPreviewSrc((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return null;
    });
    cancelUpload();
    setSourceKind(null);
    setFile(null);
    setUrlInput("");
    setLabel("");
    setLastExport(null);
    setFocus(DEFAULT_REFRAME_FOCUS);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cancelUpload]);

  const sourcePayload = async (): Promise<Record<string, string>> => {
    if (sourceKind === "url") return { url: urlInput.trim() };
    if (!file) throw new Error("Choose a video file.");
    const pending = uploadRef.current?.file === file ? uploadRef.current.promise : startUpload(file);
    return { upload: await pending, filename: file.name };
  };

  const urlMeta = useMemo(() => (previewSrc && sourceKind === "url" ? parsePresignedMeta(urlInput) : null), [previewSrc, sourceKind, urlInput]);

  const durationSeconds = useMemo(() => {
    const start = parseTimeToSeconds(startTime);
    const end = parseTimeToSeconds(endTime);
    if (start == null || end == null || end <= start) return null;
    return end - start;
  }, [startTime, endTime]);

  const onVideoMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    setEndTime(formatSeconds(v.duration));
  }, []);

  const loadUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      toast.error("Paste a video URL first.");
      return;
    }
    cancelUpload();
    setFile(null);
    setSourceKind("url");
    setPreviewSrc(trimmed);
    setLastExport(null);
    setFocus(DEFAULT_REFRAME_FOCUS);
  }, [urlInput, cancelUpload]);

  const loadFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith("video/")) {
        toast.error("Choose a video file.");
        return;
      }
      setUrlInput("");
      setSourceKind("file");
      setFile(f);
      const objectUrl = URL.createObjectURL(f);
      setPreviewSrc(objectUrl);
      setLastExport(null);
      setFocus(DEFAULT_REFRAME_FOCUS);
      startUpload(f);
    },
    [startUpload],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) loadFile(f);
    },
    [loadFile],
  );

  const setFromPlayhead = (which: "start" | "end") => {
    const v = videoRef.current;
    if (!v) return;
    const t = formatSeconds(v.currentTime);
    if (which === "start") setStartTime(t);
    else setEndTime(t);
  };

  const validateSelection = useCallback((): { start: number; end: number } | null => {
    const start = parseTimeToSeconds(startTime);
    const end = parseTimeToSeconds(endTime);
    if (start == null || end == null) {
      toast.error("Use times like 0:30 or 1:05:00.");
      return null;
    }
    if (end <= start) {
      toast.error("End time must be after start.");
      return null;
    }
    const len = end - start;
    if (len > MAX_CLIP_SECONDS) {
      toast.error(`Selections are limited to ${MAX_CLIP_SECONDS / 60} minutes.`);
      return null;
    }
    return { start, end };
  }, [startTime, endTime]);

  const exportReframe = async (): Promise<ExportedReframe | null> => {
    const range = validateSelection();
    if (!range || !sourceKind) return null;

    setBusy(true);
    setProgress(15);
    try {
      const source = await sourcePayload();
      setProgress(40);
      const res = await fetch("/api/reframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...source, ...range, focus, label }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      const exported: ExportedReframe = {
        url: data.url,
        pathname: data.pathname,
        filename: data.filename,
        bytes: data.bytes,
        label: data.label ?? null,
        range,
      };
      if (normalizeLabel(label) && !exported.label) toast.error("Video saved, but its label wasn't. Edit the label to retry.");
      return exported;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
      return null;
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const saveToDevice = async () => {
    const exported = await exportReframe();
    if (!exported) return;
    setLastExport(exported);
    startDownload(blobDownloadUrl(exported.url));
    toast.success(`Saved to downloads (${formatBytes(exported.bytes)}).`);
  };

  const createShareLink = async () => {
    const exported = await exportReframe();
    if (!exported) return;
    setLastExport(exported);
    toast.success(`Share link ready (${formatBytes(exported.bytes)}).`);
  };

  const copyUrl = () => {
    if (lastExport) void copy("reframe-url", lastExport.url, "Link copied.");
  };

  const copyForSheet = () => {
    if (!lastExport) return;
    const text = sheetLine({ url: lastExport.url, label: lastExport.label, range: lastExport.range, transcript: null });
    void copy("reframe-sheet", text, "Copied for the sheet.", { sheetCell: true });
  };

  const saveLabel = async () => {
    if (!lastExport) return;
    const sameSelection =
      parseTimeToSeconds(startTime) === lastExport.range.start && parseTimeToSeconds(endTime) === lastExport.range.end;
    const next = normalizeLabel(label);
    if (!sameSelection || next === (lastExport.label ?? "")) return;
    try {
      const res = await fetch("/api/labels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: lastExport.pathname, label: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setLastExport((item) => (item?.pathname === lastExport.pathname ? { ...item, label: data.label ?? null } : item));
      toast.success(next ? "Label saved." : "Label removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the label.");
    }
  };

  return (
    <div className={cn("grid gap-6", hasActiveSource && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
      <div className="space-y-6">
        {previewSrc ? (
          <Card className={CARD}>
            <CardHeader className={CARD_HEADER}>
              <CardTitle>Framing</CardTitle>
              <CardDescription>Position the 9:16 crop on your 16:9 (or wider) video.</CardDescription>
              <CardAction>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={resetSource}>
                  Change source
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className={CARD_CONTENT}>
              <ReframeCropPreview videoRef={videoRef} focus={focus} onFocusChange={setFocus}>
                <video
                  ref={videoRef}
                  src={previewSrc}
                  controls
                  className="aspect-video w-full object-contain"
                  onLoadedMetadata={onVideoMetadata}
                />
              </ReframeCropPreview>
              {urlMeta ? (
                <p className="text-xs text-muted-foreground">
                  {urlMeta.filename ? <span className="font-medium text-foreground">{urlMeta.filename}</span> : urlMeta.host}
                </p>
              ) : null}
              {sourceKind === "file" && file ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="truncate">
                    <span className="font-medium text-foreground">{file.name}</span> · {formatBytes(file.size)}
                    {" · "}
                    {uploadState?.status === "uploading" ? `uploading ${Math.floor(uploadState.pct)}%` : null}
                    {uploadState?.status === "done" ? "uploaded" : null}
                    {uploadState?.status === "error" ? (
                      <span className="text-destructive">upload failed — retries when you export</span>
                    ) : null}
                  </p>
                  {uploadState?.status === "uploading" ? <Progress value={uploadState.pct} className="h-1" /> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {!previewSrc ? (
          <Card className={CARD}>
            <CardHeader className={CARD_HEADER}>
              <CardTitle>Source</CardTitle>
              <CardDescription>Paste a direct video link or upload a file, then choose what to export as vertical 9:16.</CardDescription>
            </CardHeader>
            <CardContent className={CARD_CONTENT}>
              <div
                className={cn(
                  "flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground",
                  "hover:bg-muted/50",
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <p>Drag and drop a video file</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Choose file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) loadFile(f);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/video.mp4"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadUrl()}
                />
                <Button type="button" variant="secondary" onClick={loadUrl}>
                  Load URL
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {hasActiveSource ? (
        <div className="space-y-6">
          <Card className={CARD}>
            <CardHeader className={CARD_HEADER}>
              <CardTitle>In / out</CardTitle>
              <CardDescription>
                {durationSeconds != null ? `${formatSeconds(durationSeconds)} selected` : "Set start and end"}
                {durationSeconds != null && durationSeconds > MAX_CLIP_SECONDS ? " (too long)" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className={CARD_CONTENT}>
              <div className="space-y-2">
                <Label htmlFor="reframe-start">Start</Label>
                <div className="flex gap-2">
                  <Input id="reframe-start" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => setFromPlayhead("start")}>
                    Playhead
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reframe-end">End</Label>
                <div className="flex gap-2">
                  <Input id="reframe-end" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => setFromPlayhead("end")}>
                    Playhead
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reframe-duration">Selection</Label>
                <Input
                  id="reframe-duration"
                  readOnly
                  tabIndex={-1}
                  value={durationSeconds != null ? formatTimecodeHmsMs(durationSeconds) : ""}
                  placeholder="—"
                  className="font-mono tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reframe-label">
                  Label <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="reframe-label"
                  value={label}
                  maxLength={MAX_LABEL_LENGTH}
                  placeholder="Short name for the calendar"
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={() => void saveLabel()}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              </div>
              {busy ? (
                <div className="space-y-1">
                  {uploadState?.status === "uploading" ? (
                    <>
                      <Progress value={uploadState.pct} />
                      <p className="text-xs text-muted-foreground">Uploading video… {Math.floor(uploadState.pct)}%</p>
                    </>
                  ) : (
                    <>
                      <Progress value={progress} />
                      <p className="text-xs text-muted-foreground">Exporting vertical video…</p>
                    </>
                  )}
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" className="w-full" disabled={busy} onClick={createShareLink}>
                  Create share link
                </Button>
                <Button type="button" className="w-full" variant="outline" disabled={busy} onClick={saveToDevice}>
                  Save to device
                </Button>
              </div>
              {lastExport ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">Share link</p>
                  <p className="text-xs text-muted-foreground">
                    {lastExport.label ? <span className="font-medium text-foreground">{lastExport.label}</span> : "No label"}
                    {" · "}
                    {formatTimecodeRange(lastExport.range)}
                  </p>
                  <div className="flex gap-2">
                    <Input readOnly value={lastExport.url} className="min-w-0 font-mono text-xs" aria-label="Share URL" />
                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copyUrl}>
                      {copiedKey === "reframe-url" ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="w-full" onClick={copyForSheet}>
                    {copiedKey === "reframe-sheet" ? "Copied" : "Copy for sheet"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function startDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.click();
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}
