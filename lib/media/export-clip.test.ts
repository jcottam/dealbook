import { describe, expect, it } from "vitest";
import { clipFilename } from "@/lib/media/export-clip";

describe("clipFilename", () => {
  it("names the clip after the source and range", () => {
    expect(clipFilename("Jassy-proxy.mp4", { start: 60, end: 125.7 })).toBe("Jassy-proxy_1m00s-2m05s.mp4");
  });

  it("makes unsafe characters path-safe", () => {
    expect(clipFilename("Q3 deal/review (final).mov", { start: 0, end: 30 })).toBe(
      "Q3_deal_review_final_0m00s-0m30s.mp4",
    );
  });

  it("falls back when the source has no name", () => {
    expect(clipFilename(null, { start: 5, end: 35 })).toBe("clip_0m05s-0m35s.mp4");
    expect(clipFilename("???.mp4", { start: 5, end: 35 })).toBe("clip_0m05s-0m35s.mp4");
  });
});
