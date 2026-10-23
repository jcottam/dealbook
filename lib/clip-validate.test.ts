import { describe, expect, it } from "vitest";
import { isUploadPathname, parseClipJson, parseReframeJson, parseTranscribeJson } from "@/lib/clip-validate";

const MIMIR = "https://mimir-edit-web-proxies.s3.us-east-1.amazonaws.com/a/proxy_1.mp4?X-Amz-Signature=x";

describe("isUploadPathname", () => {
  it("accepts files under uploads/", () => {
    expect(isUploadPathname("uploads/Q3_review-Ab12Cd.mp4")).toBe(true);
  });

  it("rejects other prefixes and traversal", () => {
    expect(isUploadPathname("clips/abc/x.mp4")).toBe(false);
    expect(isUploadPathname("uploads/")).toBe(false);
    expect(isUploadPathname("uploads/../clips/x.mp4")).toBe(false);
    expect(isUploadPathname("uploads//x.mp4")).toBe(false);
  });
});

describe("parseTranscribeJson", () => {
  it("accepts an allowlisted URL", () => {
    expect(parseTranscribeJson({ url: MIMIR, start: 0, end: 30 })).toEqual({
      range: { start: 0, end: 30 },
      source: { kind: "url", url: MIMIR },
    });
  });

  it("accepts an upload reference with its original filename", () => {
    expect(parseTranscribeJson({ upload: "uploads/a-x1.mov", filename: "a.mov", start: 5, end: 65 })).toEqual({
      range: { start: 5, end: 65 },
      source: { kind: "upload", pathname: "uploads/a-x1.mov", filename: "a.mov" },
    });
  });

  it("rejects hosts outside the allowlist with 403", () => {
    expect(parseTranscribeJson({ url: "https://example.com/a.mp4", start: 0, end: 10 })).toEqual({
      error: "URL host is not allowlisted",
      status: 403,
    });
  });

  it("rejects bad ranges and missing sources", () => {
    expect(parseTranscribeJson({ url: MIMIR, start: 10, end: 5 })).toMatchObject({ status: 400 });
    expect(parseTranscribeJson({ url: MIMIR, start: 0, end: 181 })).toMatchObject({ status: 400 });
    expect(parseTranscribeJson({ start: 0, end: 10 })).toMatchObject({ status: 400 });
    expect(parseTranscribeJson({ upload: "clips/x.mp4", start: 0, end: 10 })).toMatchObject({ status: 400 });
  });
});

describe("parseClipJson", () => {
  it("requires a known preset", () => {
    expect(parseClipJson({ url: MIMIR, start: 0, end: 10 })).toMatchObject({ status: 400 });
    expect(parseClipJson({ url: MIMIR, start: 0, end: 10, preset: "copy" })).toMatchObject({ preset: "copy" });
  });

  it("normalizes an optional label", () => {
    expect(parseClipJson({ url: MIMIR, start: 0, end: 10, preset: "copy" })).toMatchObject({ label: "" });
    expect(parseClipJson({ url: MIMIR, start: 0, end: 10, preset: "team", label: "  Musk\nquote " })).toMatchObject({
      label: "Musk quote",
    });
    expect(parseClipJson({ url: MIMIR, start: 0, end: 10, preset: "team", label: 5 })).toMatchObject({ status: 400 });
  });
});

describe("parseReframeJson", () => {
  it("accepts source, range, and optional focus", () => {
    expect(parseReframeJson({ url: MIMIR, start: 0, end: 10 })).toMatchObject({
      focus: { centerX: 0.5, centerY: 0.5 },
      label: "",
    });
    expect(
      parseReframeJson({ url: MIMIR, start: 0, end: 10, focus: { centerX: 0.25, centerY: 0.75 } }),
    ).toMatchObject({
      focus: { centerX: 0.25, centerY: 0.75 },
    });
  });
});
