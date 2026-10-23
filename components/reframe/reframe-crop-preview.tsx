"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  cropRectForAspect,
  snapReframeAxis,
  type ReframeFocus,
  videoContentRect,
} from "@/lib/media/reframe-crop";
import { cn } from "@/lib/utils";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  focus: ReframeFocus;
  onFocusChange: (focus: ReframeFocus) => void;
  className?: string;
  children: React.ReactNode;
};

type Layout = {
  containerW: number;
  containerH: number;
  videoW: number;
  videoH: number;
};

type InteractionMode = "crop" | "preview";

export function ReframeCropPreview({ videoRef, focus, onFocusChange, className, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [interaction, setInteraction] = useState<InteractionMode>("crop");
  const dragRef = useRef(false);

  const measure = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !video.videoWidth) return;
    const rect = container.getBoundingClientRect();
    setLayout({
      containerW: rect.width,
      containerH: rect.height,
      videoW: video.videoWidth,
      videoH: video.videoHeight,
    });
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("loadedmetadata", measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    measure();
    return () => {
      video.removeEventListener("loadedmetadata", measure);
      ro.disconnect();
    };
  }, [measure, videoRef]);

  const cropAxis =
    layout && layout.videoW / layout.videoH > 9 / 16 ? "horizontal" : layout ? "vertical" : "horizontal";

  const displayCrop = layout
    ? (() => {
        const content = videoContentRect(layout.containerW, layout.containerH, layout.videoW, layout.videoH);
        const crop = cropRectForAspect(layout.videoW, layout.videoH, focus);
        const scaleX = content.width / layout.videoW;
        const scaleY = content.height / layout.videoH;
        return {
          left: content.left + crop.x * scaleX,
          top: content.top + crop.y * scaleY,
          width: crop.w * scaleX,
          height: crop.h * scaleY,
        };
      })()
    : null;

  const setAxisFocus = useCallback(
    (raw: number) => {
      const snapped = snapReframeAxis(raw);
      if (cropAxis === "horizontal") onFocusChange({ ...focus, centerX: snapped });
      else onFocusChange({ ...focus, centerY: snapped });
    },
    [cropAxis, focus, onFocusChange],
  );

  const centerCrop = useCallback(() => {
    if (cropAxis === "horizontal") onFocusChange({ ...focus, centerX: 0.5 });
    else onFocusChange({ ...focus, centerY: 0.5 });
  }, [cropAxis, focus, onFocusChange]);

  const focusFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!layout || !containerRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      const content = videoContentRect(layout.containerW, layout.containerH, layout.videoW, layout.videoH);
      const scaleX = content.width / layout.videoW;
      const scaleY = content.height / layout.videoH;
      const crop = cropRectForAspect(layout.videoW, layout.videoH, focus);

      const localX = clientX - container.left - content.left;
      const localY = clientY - container.top - content.top;
      const videoX = localX / scaleX;
      const videoY = localY / scaleY;

      if (cropAxis === "horizontal") {
        const maxX = layout.videoW - crop.w;
        const x = Math.min(maxX, Math.max(0, videoX - crop.w / 2));
        setAxisFocus(maxX > 0 ? x / maxX : 0.5);
      } else {
        const maxY = layout.videoH - crop.h;
        const y = Math.min(maxY, Math.max(0, videoY - crop.h / 2));
        setAxisFocus(maxY > 0 ? y / maxY : 0.5);
      }
    },
    [cropAxis, focus, layout, setAxisFocus],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!displayCrop || interaction !== "crop") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = true;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    focusFromClient(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const sliderValue = cropAxis === "horizontal" ? focus.centerX : focus.centerY;
  const sliderLabel = cropAxis === "horizontal" ? "Horizontal position" : "Vertical position";
  const atCenter = Math.abs(sliderValue - 0.5) < 0.001;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={interaction === "crop" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setInteraction("crop")}
        >
          Set crop
        </Button>
        <Button
          type="button"
          size="sm"
          variant={interaction === "preview" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setInteraction("preview")}
        >
          Preview video
        </Button>
      </div>

      <div ref={containerRef} className="relative w-full overflow-hidden rounded-md bg-black">
        {children}
        {displayCrop ? (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {interaction === "crop" ? (
              <div
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                style={{
                  left: displayCrop.left,
                  top: displayCrop.top,
                  width: displayCrop.width,
                  height: displayCrop.height,
                }}
              />
            ) : (
              <>
                <div
                  className="absolute border-2 border-white ring-1 ring-black/40"
                  style={{
                    left: displayCrop.left,
                    top: displayCrop.top,
                    width: displayCrop.width,
                    height: displayCrop.height,
                  }}
                />
                <div
                  className="absolute border border-dashed border-white/35"
                  style={{
                    left: displayCrop.left,
                    top: displayCrop.top,
                    width: displayCrop.width,
                    height: displayCrop.height,
                  }}
                />
              </>
            )}
          </div>
        ) : null}
        {displayCrop && interaction === "crop" ? (
          <div
            className="absolute touch-none cursor-grab active:cursor-grabbing"
            style={{
              left: displayCrop.left,
              top: displayCrop.top,
              width: displayCrop.width,
              height: displayCrop.height,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="slider"
            aria-label={sliderLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderValue * 100)}
            tabIndex={0}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.02 : 0.01;
              if (cropAxis === "horizontal" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                e.preventDefault();
                const delta = e.key === "ArrowLeft" ? -step : step;
                setAxisFocus(focus.centerX + delta);
              }
              if (cropAxis === "vertical" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                e.preventDefault();
                const delta = e.key === "ArrowUp" ? -step : step;
                setAxisFocus(focus.centerY + delta);
              }
            }}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="reframe-position">{sliderLabel}</Label>
          <Button
            type="button"
            variant={atCenter ? "secondary" : "outline"}
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={centerCrop}
          >
            Center
          </Button>
        </div>
        <div className="relative flex h-8 items-center">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-1/2 z-10 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70"
            style={{ left: "50%" }}
            aria-hidden
            title="Center"
          />
          <input
            id="reframe-position"
            type="range"
            min={0}
            max={100}
            value={Math.round(sliderValue * 100)}
            className="relative z-20 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            onChange={(e) => setAxisFocus(Number(e.target.value) / 100)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {interaction === "crop"
            ? "Drag the frame or use the slider (snaps at center). Export is 1080×1920 (9:16)."
            : "Use the player controls to watch the full frame; the box shows what will be exported. Switch to Set crop to adjust."}
        </p>
      </div>
    </div>
  );
}
