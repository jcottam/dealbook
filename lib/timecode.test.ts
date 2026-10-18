import { describe, expect, it } from "vitest";
import { formatSeconds, formatTimecodeHmsMs, parseTimeToSeconds } from "@/lib/timecode";

describe("parseTimeToSeconds", () => {
  it("parses M:SS and H:MM:SS", () => {
    expect(parseTimeToSeconds("0:30")).toBe(30);
    expect(parseTimeToSeconds("12:05")).toBe(725);
    expect(parseTimeToSeconds("1:02:03")).toBe(3723);
  });

  it("ignores a trailing frame field", () => {
    expect(parseTimeToSeconds("00:01:00:12")).toBe(60);
  });

  it("rejects malformed input", () => {
    expect(parseTimeToSeconds("")).toBeNull();
    expect(parseTimeToSeconds("90")).toBeNull();
    expect(parseTimeToSeconds("1:75")).toBeNull();
    expect(parseTimeToSeconds("a:bc")).toBeNull();
  });
});

describe("formatTimecodeHmsMs", () => {
  it("formats with hours, minutes, seconds, and milliseconds", () => {
    expect(formatTimecodeHmsMs(4.056)).toBe("00:00:04.056");
    expect(formatTimecodeHmsMs(3723.5)).toBe("01:02:03.500");
  });
});

describe("formatSeconds", () => {
  it("omits hours under an hour", () => {
    expect(formatSeconds(65)).toBe("1:05");
    expect(formatSeconds(3723)).toBe("1:02:03");
  });

  it("round-trips through parseTimeToSeconds", () => {
    for (const s of [0, 59, 61, 3599, 3600, 7322]) {
      expect(parseTimeToSeconds(formatSeconds(s))).toBe(s);
    }
  });
});
