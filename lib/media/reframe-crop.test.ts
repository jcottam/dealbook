import { describe, expect, it } from "vitest";
import {
  cropRectForAspect,
  DEFAULT_REFRAME_FOCUS,
  normalizeFocus,
  reframeVideoFilter,
  snapReframeAxis,
} from "@/lib/media/reframe-crop";

describe("cropRectForAspect", () => {
  it("crops width on 16:9 with centered default", () => {
    const { x, y, w, h } = cropRectForAspect(1920, 1080, DEFAULT_REFRAME_FOCUS);
    expect(h).toBe(1080);
    expect(w).toBeCloseTo(1080 * (9 / 16));
    expect(x).toBeCloseTo((1920 - w) / 2);
    expect(y).toBe(0);
  });

  it("shifts horizontally with centerX", () => {
    const left = cropRectForAspect(1920, 1080, { centerX: 0, centerY: 0.5 });
    const right = cropRectForAspect(1920, 1080, { centerX: 1, centerY: 0.5 });
    expect(left.x).toBe(0);
    expect(right.x).toBeGreaterThan(left.x);
  });
});

describe("snapReframeAxis", () => {
  it("snaps near center", () => {
    expect(snapReframeAxis(0.5)).toBe(0.5);
    expect(snapReframeAxis(0.48)).toBe(0.5);
    expect(snapReframeAxis(0.52)).toBe(0.5);
    expect(snapReframeAxis(0.42)).toBe(0.42);
  });
});

describe("normalizeFocus", () => {
  it("clamps out-of-range values", () => {
    expect(normalizeFocus({ centerX: -1, centerY: 2 })).toEqual({ centerX: 0, centerY: 1 });
  });
});

describe("reframeVideoFilter", () => {
  it("uses numeric even crop and 1080x1920 scale for 16:9", () => {
    const vf = reframeVideoFilter(1920, 1080, DEFAULT_REFRAME_FOCUS);
    expect(vf).toMatch(/^crop=\d+:\d+:\d+:\d+,scale=1080:1920$/);
    expect(vf).toContain("crop=606:1080:656:0");
  });
});
