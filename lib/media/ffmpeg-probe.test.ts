import { describe, expect, it } from "vitest";
import { displayDimensionsFromProbe, parseFfprobeStreamJson } from "@/lib/media/ffmpeg-probe";

describe("displayDimensionsFromProbe", () => {
  it("swaps dimensions for 90° rotation", () => {
    expect(displayDimensionsFromProbe(1920, 1080, "90")).toEqual({ width: 1080, height: 1920 });
  });

  it("keeps dimensions for landscape without rotation tag", () => {
    expect(displayDimensionsFromProbe(1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });
});

describe("parseFfprobeStreamJson", () => {
  it("reads width, height, and rotate tag", () => {
    const info = parseFfprobeStreamJson(
      JSON.stringify({ streams: [{ width: 1920, height: 1080, tags: { rotate: "90" } }] }),
    );
    expect(info).toEqual({ width: 1080, height: 1920 });
  });
});
