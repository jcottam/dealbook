import { afterEach, describe, expect, it, vi } from "vitest";
import { previewShareUrl } from "@/lib/social-post-preview/share-url";

describe("previewShareUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses localhost in development on the server", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(previewShareUrl("abc")).toBe("http://localhost:3000/preview/abc");
  });

  it("uses VERCEL_URL when set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_URL", "media-utils-git-main.vercel.app");
    expect(previewShareUrl("abc")).toBe("https://media-utils-git-main.vercel.app/preview/abc");
  });

  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_URL", "deployment.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://media-utils.com");
    expect(previewShareUrl("abc")).toBe("https://media-utils.com/preview/abc");
  });

  it("falls back to production domain", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_URL", "");
    expect(previewShareUrl("x/y")).toBe("https://media-utils.com/preview/x%2Fy");
  });
});
