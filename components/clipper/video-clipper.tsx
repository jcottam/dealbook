"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatSeconds, MAX_CLIP_SECONDS, parseTimeToSeconds } from "@/lib/timecode";
import { parsePresignedMeta } from "@/lib/clip-url";
import { cn } from "@/lib/utils";

type SourceKind = "url" | "file";
type ClipPreset = "team" | "copy";
type ExportedClip = { url: string; filename: string; bytes: number };
type UploadState = { status: "uploading"; pct: number } | { status: "done" } | { status: "error"; message: string };
type PendingUpload = { file: File; promise: Promise<string>; abort: AbortController };

const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;

export function VideoClipper() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urlInput, setUrlInput] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState("0:00");
  const [endTime, setEndTime] = useState("0:30");
  const [preset, setPreset] = useState<ClipPreset>("team");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [lastClip, setLastClip] = useState<ExportedClip | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const uploadRef = useRef<PendingUpload | null>(null);

  /** Uploads straight to private Blob; the server reads it back from there for clip and transcribe. */
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

  const sourcePayload = async (): Promise<Record<string, string>> => {
    if (sourceKind === "url") return { url: urlInput.trim() };
    if (!file) throw new Error("Choose a video file.");
    const pending = uploadRef.current?.file === file ? uploadRef.current.promise : startUpload(file);
    return { upload: await pending, filename: file.name };
  };

  const postJson = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  };

  const urlMeta = useMemo(() => (previewSrc && sourceKind === "url" ? parsePresignedMeta(urlInput) : null), [previewSrc, sourceKind, urlInput]);

  const durationSeconds = useMemo(() => {
    const start = parseTimeToSeconds(startTime);
    const end = parseTimeToSeconds(endTime);
    if (start == null || end == null || end <= start) return null;
    return end - start;
  }, [startTime, endTime]);

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
    setTranscript("");
    setLastClip(null);
  }, [urlInput, cancelUpload]);

  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) {
      toast.error("Choose a video file.");
      return;
    }
    setUrlInput("");
    setSourceKind("file");
    setFile(f);
    const objectUrl = URL.createObjectURL(f);
    setPreviewSrc(objectUrl);
    setTranscript("");
    setLastClip(null);
    startUpload(f);
  }, [startUpload]);

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
    const label = formatSeconds(v.currentTime);
    if (which === "start") setStartTime(label);
    else setEndTime(label);
  };

  const validateSelection = (): { start: number; end: number } | null => {
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
      toast.error(`Clips are limited to ${MAX_CLIP_SECONDS / 60} minutes.`);
      return null;
    }
    return { start, end };
  };

  const downloadClip = async () => {
    const range = validateSelection();
    if (!range || !sourceKind) return;

    setBusy("clip");
    setProgress(15);
    try {
      const source = await sourcePayload();
      setProgress(40);
      const data = await postJson("/api/clip", { ...source, ...range, preset });
      const clip: ExportedClip = { url: data.downloadUrl, filename: data.filename, bytes: data.bytes };
      setLastClip(clip);
      startDownload(clip.url);
      toast.success(`Clip ready (${formatBytes(clip.bytes)}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clip failed.");
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  const runTranscribe = async () => {
    const range = validateSelection();
    if (!range || !sourceKind) return;

    setBusy("transcribe");
    setProgress(15);
    try {
      const source = await sourcePayload();
      setProgress(40);
      const data = await postJson("/api/transcribe", { ...source, ...range });
      setTranscript(data.text ?? "");
      toast.success("Transcript ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  const copyTranscript = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    toast.success("Copied to clipboard.");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>Upload, drop, or paste a Mimir proxy URL. Files upload to private storage in the background; clipping runs server-side.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                placeholder="https://…/proxy_1.mp4?…"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUrl()}
              />
              <Button type="button" variant="secondary" onClick={loadUrl}>
                Load URL
              </Button>
            </div>
            {urlMeta ? (
              <p className="text-xs text-muted-foreground">
                {urlMeta.filename ? <span className="font-medium text-foreground">{urlMeta.filename}</span> : urlMeta.host}
                {urlMeta.expiresAt ? (
                  <>
                    {" · "}
                    link expires {urlMeta.expiresAt.toLocaleString()}
                  </>
                ) : null}
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
                    <span className="text-destructive">upload failed, retries when you clip or transcribe</span>
                  ) : null}
                </p>
                {uploadState?.status === "uploading" ? <Progress value={uploadState.pct} className="h-1" /> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {previewSrc ? (
          <Card>
            <CardContent className="pt-6">
              <video ref={videoRef} src={previewSrc} controls className="aspect-video w-full rounded-md bg-black" />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>In / out</CardTitle>
            <CardDescription>
              {durationSeconds != null ? `${formatSeconds(durationSeconds)} selected` : "Set start and end"}
              {durationSeconds != null && durationSeconds > MAX_CLIP_SECONDS ? " (too long)" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <div className="flex gap-2">
                <Input id="start" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <Button type="button" variant="outline" size="sm" onClick={() => setFromPlayhead("start")}>
                  Playhead
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <div className="flex gap-2">
                <Input id="end" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                <Button type="button" variant="outline" size="sm" onClick={() => setFromPlayhead("end")}>
                  Playhead
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Export quality</Label>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={preset === "team" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setPreset("team")}
                >
                  Share quality
                </Button>
                <Button
                  type="button"
                  variant={preset === "copy" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setPreset("copy")}
                >
                  Full quality
                </Button>
              </div>
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
                    <p className="text-xs text-muted-foreground">{busy === "clip" ? "Creating clip…" : "Transcribing…"}</p>
                  </>
                )}
              </div>
            ) : null}
            <Button type="button" className="w-full" disabled={!previewSrc || !!busy} onClick={downloadClip}>
              Download clip
            </Button>
            {lastClip ? (
              <p className="truncate text-xs text-muted-foreground">
                Last clip:{" "}
                <a href={lastClip.url} className="font-medium text-foreground underline underline-offset-4">
                  {lastClip.filename}
                </a>{" "}
                · {formatBytes(lastClip.bytes)} · link valid 1 hour
              </p>
            ) : null}
            <Button type="button" className="w-full" variant="secondary" disabled={!previewSrc || !!busy} onClick={runTranscribe}>
              Transcribe selection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={transcript} readOnly placeholder="Run transcribe to fill this in." rows={8} className="resize-none text-sm" />
            <Button type="button" variant="outline" size="sm" disabled={!transcript} onClick={copyTranscript}>
              Copy to clipboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** The signed Blob URL responds with `Content-Disposition: attachment`, so navigating to it downloads. */
function startDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.click();
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}
