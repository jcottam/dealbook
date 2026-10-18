import { describe, expect, it } from "vitest";
import { audioExtractArgs, redactUrls } from "@/lib/media/ffmpeg-args";

describe("audioExtractArgs", () => {
  it("seeks before the input and limits duration", () => {
    const args = audioExtractArgs("https://h/v.mp4?sig=1", { start: 65.5, end: 125.5 }, "/out.mp3");
    expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"));
    expect(args[args.indexOf("-ss") + 1]).toBe("65.500");
    expect(args[args.indexOf("-t") + 1]).toBe("60.000");
    expect(args[args.indexOf("-i") + 1]).toBe("https://h/v.mp4?sig=1");
    expect(args.at(-1)).toBe("/out.mp3");
  });

  it("drops video and downmixes to mono 16 kHz", () => {
    const args = audioExtractArgs("in.mp4", { start: 0, end: 10 }, "o.mp3");
    expect(args).toContain("-vn");
    expect(args.slice(args.indexOf("-ac"), args.indexOf("-ac") + 2)).toEqual(["-ac", "1"]);
    expect(args.slice(args.indexOf("-ar"), args.indexOf("-ar") + 2)).toEqual(["-ar", "16000"]);
  });
});

describe("redactUrls", () => {
  it("removes presigned query strings", () => {
    const msg =
      "https://bucket.s3.amazonaws.com/a/proxy_1.mp4?X-Amz-Signature=abc&X-Amz-Credential=AKIA: Server returned 403 Forbidden";
    expect(redactUrls(msg)).toBe(
      "https://bucket.s3.amazonaws.com/a/proxy_1.mp4?…: Server returned 403 Forbidden",
    );
  });

  it("leaves text without URLs alone", () => {
    expect(redactUrls("Invalid data found when processing input")).toBe(
      "Invalid data found when processing input",
    );
  });
});
