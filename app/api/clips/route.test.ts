import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { labelSidecarPathname } from "@/lib/asset-labels";

const blob = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  list: blob.list,
}));

const { GET } = await import("@/app/api/clips/route");

const TOKEN = "vercel_blob_rw_StoreAbc_secret";
const HOST = "https://storeabc.public.blob.vercel-storage.com";
const CLIP = "clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/Musk_4m55s-5m17s.mp4";

function stored(pathname: string, uploadedAt = "2026-10-18T00:00:00Z", size = 100) {
  return { url: `${HOST}/${pathname}`, downloadUrl: `${HOST}/${pathname}?download=1`, pathname, size, uploadedAt: new Date(uploadedAt) };
}

beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/clips", () => {
  it("lists mp4 clips with labels", async () => {
    const sidecar = labelSidecarPathname(CLIP, "Main stage moment");
    blob.list.mockResolvedValue({
      hasMore: false,
      blobs: [stored(CLIP, "2026-10-18T00:00:00Z", 500), stored(sidecar, "2026-10-18T00:00:01Z", 10)],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(blob.list).toHaveBeenCalledWith({ prefix: "clips/", limit: 1000, cursor: undefined, token: TOKEN });
    expect(data.clips).toEqual([
      {
        url: `${HOST}/${CLIP}`,
        pathname: CLIP,
        name: "Musk_4m55s-5m17s.mp4",
        label: "Main stage moment",
        size: 500,
        uploadedAt: "2026-10-18T00:00:00.000Z",
      },
    ]);
  });
});
