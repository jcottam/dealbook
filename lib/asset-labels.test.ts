import { describe, expect, it } from "vitest";
import {
  assetFolder,
  isClipPathname,
  isLabelSidecar,
  labelFromSidecar,
  labelSidecarPathname,
  MAX_LABEL_LENGTH,
  normalizeLabel,
} from "@/lib/asset-labels";

const IMAGE = "images/a1b2c3d4e5/_DSC0457.jpg";
const CLIP = "clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/Musk_4m55s-5m17s.mp4";

describe("normalizeLabel", () => {
  it("trims and collapses whitespace to one line", () => {
    expect(normalizeLabel("  Title   slide \n")).toBe("Title slide");
    expect(normalizeLabel("Dealbook Summit / 2023 /\nLive stream")).toBe("Dealbook Summit / 2023 / Live stream");
  });

  it("returns empty for non-strings", () => {
    expect(normalizeLabel(undefined)).toBe("");
    expect(normalizeLabel(42)).toBe("");
  });

  it("caps length and UTF-8 size", () => {
    expect(normalizeLabel("a".repeat(500))).toHaveLength(MAX_LABEL_LENGTH);
    expect(new TextEncoder().encode(normalizeLabel("日".repeat(200))).length).toBeLessThanOrEqual(400);
  });
});

describe("label sidecars", () => {
  it("round-trips Mjoll paths, punctuation, and unicode", () => {
    for (const label of [
      "Photography/NYT/Selects/Main Stage/_DSC0457.jpg",
      "Dealbook Summit / 2023 / Live stream recordings / Elon Musk ceo tesla, x, spaceX.mp4",
      "Title slide",
      "What’s Next — “quote” & more?",
    ]) {
      const sidecar = labelSidecarPathname(IMAGE, label);
      expect(sidecar.startsWith("images/a1b2c3d4e5/label-")).toBe(true);
      expect(sidecar).toMatch(/^[\w/.-]+$/);
      expect(isLabelSidecar(sidecar)).toBe(true);
      expect(labelFromSidecar(sidecar)).toBe(label);
    }
  });

  it("lives next to clips too", () => {
    expect(labelFromSidecar(labelSidecarPathname(CLIP, "Musk quote"))).toBe("Musk quote");
    expect(assetFolder(CLIP)).toBe("clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/");
  });

  it("ignores non-sidecars and corrupt encodings", () => {
    expect(isLabelSidecar(IMAGE)).toBe(false);
    expect(labelFromSidecar(IMAGE)).toBeNull();
    expect(labelFromSidecar("images/a1b2c3d4e5/label-_w.txt")).toBeNull();
  });
});

describe("isClipPathname", () => {
  it("accepts exported clips only", () => {
    expect(isClipPathname(CLIP)).toBe(true);
    expect(isClipPathname("clips/abc/x.mp4")).toBe(false);
    expect(isClipPathname("uploads/x.mp4")).toBe(false);
    expect(isClipPathname("clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/../x.mp4")).toBe(false);
    expect(isClipPathname("clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/x.mov")).toBe(false);
  });
});
