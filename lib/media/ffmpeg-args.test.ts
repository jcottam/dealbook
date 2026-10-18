import { describe, expect, it } from "vitest";
import { audioExtractArgs, clipArgs, redactUrls } from "@/lib/media/ffmpeg-args";

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

describe("clipArgs", () => {
  const range = { start: 30, end: 90 };

  it("seeks before the input and writes a faststart MP4", () => {
    const args = clipArgs("https://h/v.mp4?sig=1", range, "/out.mp4", "team");
    expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"));
    expect(args[args.indexOf("-t") + 1]).toBe("60.000");
    expect(args.slice(args.indexOf("-movflags"), args.indexOf("-movflags") + 2)).toEqual(["-movflags", "+faststart"]);
    expect(args.at(-1)).toBe("/out.mp4");
  });

  it("team preset re-encodes to H.264 capped at 720p", () => {
    const args = clipArgs("in.mp4", range, "o.mp4", "team");
    expect(args[args.indexOf("-c:v") + 1]).toBe("libx264");
    expect(args[args.indexOf("-vf") + 1]).toBe("scale=-2:'min(720,ih)'");
    expect(args).not.toContain("copy");
  });

  it("copy preset keeps source streams", () => {
    const args = clipArgs("in.mp4", range, "o.mp4", "copy");
    expect(args.slice(args.indexOf("-c"), args.indexOf("-c") + 2)).toEqual(["-c", "copy"]);
    expect(args).not.toContain("-vf");
  });

  it("tolerates sources without audio", () => {
    expect(clipArgs("in.mp4", range, "o.mp4", "team")).toContain("0:a:0?");
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
