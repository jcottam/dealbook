import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedClipUrl, parsePresignedMeta } from "@/lib/clip-url";

const MIMIR =
  "https://mimir-edit-web-proxies.s3.us-east-1.amazonaws.com/abc/proxy_1.mp4" +
  "?X-Amz-Date=20261018T000000Z&X-Amz-Expires=432000" +
  "&response-content-disposition=attachment%3Bfilename%3DJassy-proxy.mp4";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAllowedClipUrl", () => {
  it("accepts the default Mimir host over https", () => {
    expect(isAllowedClipUrl(MIMIR)).toBe(true);
  });

  it("rejects other hosts, http, and lookalike suffixes", () => {
    expect(isAllowedClipUrl("https://example.com/a.mp4")).toBe(false);
    expect(isAllowedClipUrl(MIMIR.replace("https:", "http:"))).toBe(false);
    expect(
      isAllowedClipUrl("https://evilmimir-edit-web-proxies.s3.us-east-1.amazonaws.com/a.mp4"),
    ).toBe(false);
    expect(isAllowedClipUrl("not a url")).toBe(false);
  });

  it("uses CLIP_ALLOWED_HOSTS when set", () => {
    vi.stubEnv("CLIP_ALLOWED_HOSTS", "media.example.com, other.example.com");
    expect(isAllowedClipUrl("https://media.example.com/a.mp4")).toBe(true);
    expect(isAllowedClipUrl(MIMIR)).toBe(false);
  });
});

describe("parsePresignedMeta", () => {
  it("reads filename and expiry from presigned params", () => {
    const meta = parsePresignedMeta(MIMIR);
    expect(meta?.filename).toBe("Jassy-proxy.mp4");
    expect(meta?.expiresAt?.toISOString()).toBe("2026-10-23T00:00:00.000Z");
  });

  it("returns nulls when params are absent", () => {
    const meta = parsePresignedMeta("https://example.com/a.mp4");
    expect(meta).toEqual({ host: "example.com", filename: null, expiresAt: null });
  });
});
