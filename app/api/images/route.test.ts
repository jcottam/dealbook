import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { labelSidecarPathname } from "@/lib/asset-labels";

const blob = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn(), put: vi.fn(), handleUpload: vi.fn() }));

vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  list: blob.list,
  del: blob.del,
  put: blob.put,
}));
vi.mock("@vercel/blob/client", () => ({ handleUpload: blob.handleUpload }));

const { GET, DELETE } = await import("@/app/api/images/route");
const { POST } = await import("@/app/api/images/upload/route");
const { PUT } = await import("@/app/api/labels/route");

const TOKEN = "vercel_blob_rw_StoreAbc_secret";
const HOST = "https://storeabc.public.blob.vercel-storage.com";
const OLD = "images/aaaaaaaaaa/_DSC0457.jpg";
const NEW = "images/bbbbbbbbbb/speaker_headshot.png";
const CLIP = "clips/0b7c6f1e-3c9a-4d2e-9f8a-1234567890ab/Musk_4m55s-5m17s.mp4";

function stored(pathname: string, uploadedAt = "2026-10-18T00:00:00Z", size = 100) {
  return { url: `${HOST}/${pathname}`, downloadUrl: `${HOST}/${pathname}?download=1`, pathname, size, uploadedAt: new Date(uploadedAt) };
}

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/images", {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", TOKEN);
  vi.stubEnv("BLOB_STORE_ID", "store_private");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/images", () => {
  it("lists images newest first with labels from their sidecars", async () => {
    const sidecar = labelSidecarPathname(OLD, "Photography/NYT/Selects/Main Stage/_DSC0457.jpg");
    blob.list.mockResolvedValue({
      hasMore: false,
      blobs: [
        stored(OLD, "2026-10-01T00:00:00Z"),
        stored(sidecar, "2026-10-01T00:00:01Z", 10),
        stored(NEW, "2026-10-18T00:00:00Z", 200),
        stored("images/legacy.jpg", "2026-10-19T00:00:00Z"),
      ],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(blob.list).toHaveBeenCalledWith({ prefix: "images/", limit: 1000, cursor: undefined, token: TOKEN });
    expect(data).toEqual({
      hasMore: false,
      images: [
        { url: `${HOST}/${NEW}`, pathname: NEW, name: "speaker_headshot.png", label: null, size: 200, uploadedAt: "2026-10-18T00:00:00.000Z" },
        {
          url: `${HOST}/${OLD}`,
          pathname: OLD,
          name: "_DSC0457.jpg",
          label: "Photography/NYT/Selects/Main Stage/_DSC0457.jpg",
          size: 100,
          uploadedAt: "2026-10-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("follows list pagination", async () => {
    blob.list
      .mockResolvedValueOnce({ hasMore: true, cursor: "c1", blobs: [stored(OLD)] })
      .mockResolvedValueOnce({ hasMore: false, blobs: [stored(NEW)] });
    const data = await (await GET()).json();
    expect(blob.list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "c1" }));
    expect(data.images).toHaveLength(2);
  });

  it("returns 501 without the public store token", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const res = await GET();
    expect(res.status).toBe(501);
    expect(blob.list).not.toHaveBeenCalled();
  });

  it("hides SDK errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    blob.list.mockRejectedValue(new Error("Vercel Blob: secret detail"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).not.toContain("secret");
  });
});

describe("DELETE /api/images", () => {
  it("deletes the image and its label from the public store", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const sidecar = labelSidecarPathname(OLD, "Title slide");
    blob.list.mockResolvedValue({ hasMore: false, blobs: [stored(OLD), stored(sidecar)] });
    blob.del.mockResolvedValue(undefined);
    const res = await DELETE(jsonRequest("DELETE", { pathname: OLD }));
    expect(res.status).toBe(200);
    expect(blob.list).toHaveBeenCalledWith({ prefix: "images/aaaaaaaaaa/", token: TOKEN });
    expect(blob.del).toHaveBeenCalledWith([`${HOST}/${OLD}`, `${HOST}/${sidecar}`], { token: TOKEN });
  });

  it("refuses anything that isn't an image", async () => {
    for (const pathname of [CLIP, "uploads/source.mp4", "images/aaaaaaaaaa/../x.jpg", "images/a.jpg", 42]) {
      const res = await DELETE(jsonRequest("DELETE", { pathname }));
      expect(res.status).toBe(400);
    }
    expect(blob.del).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    expect((await DELETE(jsonRequest("DELETE", "{"))).status).toBe(400);
    expect((await DELETE(jsonRequest("DELETE", "null"))).status).toBe(400);
  });
});

describe("POST /api/images/upload", () => {
  const tokenRequest = (pathname: string) =>
    jsonRequest("POST", { type: "blob.generate-client-token", payload: { pathname, multipart: false, clientPayload: null } });

  it("issues tokens from the public store with image constraints", async () => {
    blob.handleUpload.mockImplementation(async ({ body, onBeforeGenerateToken }) => ({
      type: body.type,
      options: await onBeforeGenerateToken(body.payload.pathname, null, false),
    }));
    const res = await POST(tokenRequest("images/aaaaaaaaaa/IMG_0001.heic"));
    expect(res.status).toBe(200);
    expect(blob.handleUpload).toHaveBeenCalledWith(expect.objectContaining({ token: TOKEN }));
    const { options } = await res.json();
    expect(options.allowedContentTypes).toContain("image/heic");
    expect(options.allowedContentTypes).not.toContain("video/*");
    expect(options.maximumSizeInBytes).toBe(50 * 1024 * 1024);
    expect(options.addRandomSuffix).toBe(false);
  });

  it("rejects paths outside images/<id>/", async () => {
    blob.handleUpload.mockImplementation(async ({ body, onBeforeGenerateToken }) =>
      onBeforeGenerateToken(body.payload.pathname, null, false),
    );
    for (const pathname of ["clips/abc/a.png", "images/a.png", labelSidecarPathname(OLD, "x")]) {
      const res = await POST(tokenRequest(pathname));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Invalid image path");
    }
  });

  it("returns 501 without the public store token", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect((await POST(tokenRequest("images/aaaaaaaaaa/a.png"))).status).toBe(501);
    expect(blob.handleUpload).not.toHaveBeenCalled();
  });
});

describe("PUT /api/labels", () => {
  it("replaces an image's label sidecar", async () => {
    const old = labelSidecarPathname(OLD, "Old label");
    blob.list.mockResolvedValue({ hasMore: false, blobs: [stored(OLD), stored(old)] });
    const res = await PUT(jsonRequest("PUT", { pathname: OLD, label: " Title  slide " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ label: "Title slide" });
    expect(blob.put).toHaveBeenCalledWith(
      labelSidecarPathname(OLD, "Title slide"),
      "Title slide",
      expect.objectContaining({ access: "public", addRandomSuffix: false, allowOverwrite: true, token: TOKEN }),
    );
    expect(blob.del).toHaveBeenCalledWith([`${HOST}/${old}`], { token: TOKEN });
  });

  it("labels clips and clears labels when empty", async () => {
    const old = labelSidecarPathname(CLIP, "Musk quote");
    blob.list.mockResolvedValue({ hasMore: false, blobs: [stored(CLIP), stored(old)] });
    const res = await PUT(jsonRequest("PUT", { pathname: CLIP, label: "" }));
    expect(await res.json()).toEqual({ label: null });
    expect(blob.put).not.toHaveBeenCalled();
    expect(blob.del).toHaveBeenCalledWith([`${HOST}/${old}`], { token: TOKEN });
  });

  it("does nothing when the label is unchanged", async () => {
    blob.list.mockResolvedValue({ hasMore: false, blobs: [stored(CLIP), stored(labelSidecarPathname(CLIP, "Musk quote"))] });
    await PUT(jsonRequest("PUT", { pathname: CLIP, label: "Musk quote" }));
    expect(blob.put).not.toHaveBeenCalled();
    expect(blob.del).not.toHaveBeenCalled();
  });

  it("rejects other paths and non-string labels", async () => {
    for (const body of [{ pathname: "uploads/a.mp4", label: "x" }, { pathname: "images/a.jpg" }, { pathname: OLD, label: 3 }]) {
      expect((await PUT(jsonRequest("PUT", body))).status).toBe(400);
    }
    expect(blob.list).not.toHaveBeenCalled();
  });
});
