import { describe, expect, it } from "vitest";
import { formatTimecodeRange, sheetCellHtml, sheetLine, sheetText } from "@/lib/sheet-format";

const IMG = "https://x.public.blob.vercel-storage.com/images/a1b2c3d4e5/_DSC0457.jpg";
const CLIP = "https://x.public.blob.vercel-storage.com/clips/u/Musk_4m55s-5m17s.mp4";

describe("formatTimecodeRange", () => {
  it("uses zero-padded HH:MM:SS and an en dash", () => {
    expect(formatTimecodeRange({ start: 295, end: 317.9 })).toBe("00:04:55–00:05:17");
    expect(formatTimecodeRange({ start: 3661, end: 3700 })).toBe("01:01:01–01:01:40");
  });
});

describe("sheetLine", () => {
  it("formats images as '<label>: <url>'", () => {
    expect(sheetLine({ url: IMG, label: "Title slide" })).toBe(`Title slide: ${IMG}`);
    expect(sheetLine({ url: IMG, label: "Photography/NYT/Selects/Main Stage/_DSC0457.jpg" })).toBe(
      `Photography/NYT/Selects/Main Stage/_DSC0457.jpg: ${IMG}`,
    );
  });

  it("falls back to the bare URL without a label", () => {
    expect(sheetLine({ url: IMG })).toBe(IMG);
    expect(sheetLine({ url: IMG, label: "  " })).toBe(IMG);
  });

  it("formats clips as '<label> (<in>–<out>): <url>'", () => {
    expect(sheetLine({ url: CLIP, label: "Musk quote", range: { start: 295, end: 317 } })).toBe(
      `Musk quote (00:04:55–00:05:17): ${CLIP}`,
    );
    expect(sheetLine({ url: CLIP, range: { start: 295, end: 317 } })).toBe(`00:04:55–00:05:17: ${CLIP}`);
  });

  it("appends the transcript as a quoted line", () => {
    expect(
      sheetLine({ url: CLIP, label: "Musk quote", range: { start: 295, end: 317 }, transcript: " I have no problem\nbeing hated. " }),
    ).toBe(`Musk quote (00:04:55–00:05:17): ${CLIP}\n"I have no problem being hated."`);
  });
});

describe("sheetText", () => {
  it("puts one image per line in the given order", () => {
    expect(sheetText([{ url: "u1", label: "Slide 1" }, { url: "u2" }])).toBe("Slide 1: u1\nu2");
  });
});

describe("sheetCellHtml", () => {
  it("keeps all lines in one cell and escapes HTML", () => {
    expect(sheetCellHtml('A & B: u1\n"<q>"')).toBe(
      "<table><tr><td>A &amp; B: u1<br>&quot;&lt;q&gt;&quot;</td></tr></table>",
    );
  });
});
