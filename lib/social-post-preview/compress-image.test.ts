import { describe, expect, it } from "vitest";
import { scaleToMaxEdge, shouldCompressSocialImage } from "@/lib/social-post-preview/compress-image";

describe("scaleToMaxEdge", () => {
  it("leaves small images unchanged", () => {
    expect(scaleToMaxEdge(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("scales down the long edge to 1440", () => {
    expect(scaleToMaxEdge(4000, 3000)).toEqual({ width: 1440, height: 1080 });
    expect(scaleToMaxEdge(3000, 4000)).toEqual({ width: 1080, height: 1440 });
  });
});

describe("shouldCompressSocialImage", () => {
  it("skips gif", () => {
    expect(shouldCompressSocialImage({ type: "image/gif", name: "a.gif" })).toBe(false);
  });

  it("compresses jpeg and png", () => {
    expect(shouldCompressSocialImage({ type: "image/jpeg", name: "a.jpg" })).toBe(true);
    expect(shouldCompressSocialImage({ type: "image/png", name: "a.png" })).toBe(true);
  });
});
