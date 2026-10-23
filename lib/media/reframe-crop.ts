/** Normalized focal point for the 9:16 crop window (0 = left/top, 1 = right/bottom). */
export type ReframeFocus = { centerX: number; centerY: number };

export const DEFAULT_REFRAME_FOCUS: ReframeFocus = { centerX: 0.5, centerY: 0.5 };

export const REFRAME_OUTPUT_WIDTH = 1080;
export const REFRAME_OUTPUT_HEIGHT = 1920;

const TARGET_AR = 9 / 16;

export function clampFocus(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** When the slider or drag ends within this distance of 0.5, snap to center. */
export const REFRAME_CENTER_SNAP = 0.04;

export function snapReframeAxis(value: number): number {
  const v = clampFocus(value);
  return Math.abs(v - 0.5) <= REFRAME_CENTER_SNAP ? 0.5 : v;
}

export function normalizeFocus(focus: Partial<ReframeFocus> | undefined): ReframeFocus {
  return {
    centerX: clampFocus(focus?.centerX ?? DEFAULT_REFRAME_FOCUS.centerX),
    centerY: clampFocus(focus?.centerY ?? DEFAULT_REFRAME_FOCUS.centerY),
  };
}

/** Even size for crop width/height (minimum 2). */
export function evenDimension(n: number): number {
  const v = Math.floor(n);
  if (v < 2) return 2;
  return v % 2 === 0 ? v : v - 1;
}

/** Even offset for crop x/y (0 is valid). */
export function evenOffset(n: number): number {
  const v = Math.max(0, Math.floor(n));
  return v % 2 === 0 ? v : v - 1;
}

/** Pixel crop on the source frame before scale to 9:16 output. */
export function cropRectForAspect(
  videoWidth: number,
  videoHeight: number,
  focus: ReframeFocus,
): { x: number; y: number; w: number; h: number } {
  if (videoWidth <= 0 || videoHeight <= 0) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const videoAr = videoWidth / videoHeight;
  if (videoAr > TARGET_AR) {
    const h = videoHeight;
    const w = h * TARGET_AR;
    const x = (videoWidth - w) * clampFocus(focus.centerX);
    return { x, y: 0, w, h };
  }
  const w = videoWidth;
  const h = w / TARGET_AR;
  const y = (videoHeight - h) * clampFocus(focus.centerY);
  return { x: 0, y, w, h };
}

/** Same as {@link cropRectForAspect} with even dimensions for ffmpeg H.264 output. */
export function cropRectForEncode(
  videoWidth: number,
  videoHeight: number,
  focus: ReframeFocus,
): { x: number; y: number; w: number; h: number } {
  const raw = cropRectForAspect(videoWidth, videoHeight, focus);
  let w = evenDimension(raw.w);
  let h = evenDimension(raw.h);
  let x = evenOffset(raw.x);
  let y = evenOffset(raw.y);
  if (x + w > videoWidth) x = evenOffset(Math.max(0, videoWidth - w));
  if (y + h > videoHeight) y = evenOffset(Math.max(0, videoHeight - h));
  w = Math.min(w, evenDimension(videoWidth - x));
  h = Math.min(h, evenDimension(videoHeight - y));
  if (w < 2 || h < 2) {
    throw new Error("Video frame is too small to crop to 9:16");
  }
  return { x, y, w, h };
}

/** Where the video pixels are drawn inside a container (`object-fit: contain`). */
export function videoContentRect(containerW: number, containerH: number, videoW: number, videoH: number) {
  const va = videoW / videoH;
  const ca = containerW / containerH;
  if (va > ca) {
    const width = containerW;
    const height = containerW / va;
    return { left: 0, top: (containerH - height) / 2, width, height };
  }
  const height = containerH;
  const width = containerH * va;
  return { left: (containerW - width) / 2, top: 0, width, height };
}

/** ffmpeg `crop` + `scale` for 9:16 vertical export (numeric crop — no expression parser quirks). */
export function reframeVideoFilterFromRect(
  rect: { x: number; y: number; w: number; h: number },
  outW = REFRAME_OUTPUT_WIDTH,
  outH = REFRAME_OUTPUT_HEIGHT,
): string {
  return `crop=${rect.w}:${rect.h}:${rect.x}:${rect.y},scale=${outW}:${outH}`;
}

/** Build filter from known frame size (matches UI crop math). */
export function reframeVideoFilter(
  videoWidth: number,
  videoHeight: number,
  focus: ReframeFocus,
  outW = REFRAME_OUTPUT_WIDTH,
  outH = REFRAME_OUTPUT_HEIGHT,
): string {
  const rect = cropRectForEncode(videoWidth, videoHeight, focus);
  return reframeVideoFilterFromRect(rect, outW, outH);
}
