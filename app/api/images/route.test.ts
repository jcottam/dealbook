import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn(), handleUpload: vi.fn() }));

vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  list: blob.list,
  del: blob.del,
}));
vi.mock("@vercel/blob/client", () => ({ handleUpload: blob.handleUpload }));

const { GET, DELETE } = await import("@/app/api/images/route");
const { POST } = await import("@/app/api/images/upload/route");

const TOKEN = "vercel_blob_rw_StoreAbc_secret";

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
  it("lists images/ in the public store, newest first", async () => {
    blob.list.mockResolvedValue({
      hasMore: false,
      blobs: [
        {
          url: "https://storeabc.public.blob.vercel-storage.com/images/old-oYnXSVczoLa9yBYMFJOSNdaiiervF5.jpg",
          downloadUrl: "https://storeabc.public.blob.vercel-storage.com/images/old.jpg?download=1",
          pathname: "images/old-oYnXSVczoLa9yBYMFJOSNdaiiervF5.jpg",
          size: 100,
          uploadedAt: new Date("2026-10-01T00:00:00Z"),
        },
        {
          url: "https://storeabc.public.blob.vercel-storage.com/images/new.png",
          downloadUrl: "https://storeabc.public.blob.vercel-storage.com/images/new.png?download=1",
          pathname: "images/new.png",
          size: 200,
          uploadedAt: new Date("2026-10-18T00:00:00Z"),
        },
        {
          url: "https://storeabc.public.blob.vercel-storage.com/images/notes.txt",
          downloadUrl: "",
          pathname: "images/notes.txt",
          size: 1,
          uploadedAt: new Date("2026-10-19T00:00:00Z"),
        },
      ],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(blob.list).toHaveBeenCalledWith({ prefix: "images/", limit: 1000, token: TOKEN });
    expect(data.hasMore).toBe(false);
    expect(data.images.map((i: { name: string }) => i.name)).toEqual(["new.png", "old.jpg"]);
    expect(data.images[0].uploadedAt).toBe("2026-10-18T00:00:00.000Z");
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
  it("deletes an image from the public store", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    blob.del.mockResolvedValue(undefined);
    const res = await DELETE(jsonRequest("DELETE", { pathname: "images/a.jpg" }));
    expect(res.status).toBe(200);
    expect(blob.del).toHaveBeenCalledWith("images/a.jpg", { token: TOKEN });
  });

  it("refuses anything outside images/", async () => {
    for (const pathname of ["clips/x/clip.mp4", "uploads/source.mp4", "images/../clips/a.jpg", 42]) {
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
    const res = await POST(tokenRequest("images/a.heic"));
    expect(res.status).toBe(200);
    expect(blob.handleUpload).toHaveBeenCalledWith(expect.objectContaining({ token: TOKEN }));
    const { options } = await res.json();
    expect(options.allowedContentTypes).toContain("image/heic");
    expect(options.allowedContentTypes).not.toContain("video/*");
    expect(options.maximumSizeInBytes).toBe(50 * 1024 * 1024);
  });

  it("rejects paths outside images/", async () => {
    blob.handleUpload.mockImplementation(async ({ body, onBeforeGenerateToken }) =>
      onBeforeGenerateToken(body.payload.pathname, null, false),
    );
    const res = await POST(tokenRequest("clips/abc/a.png"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid image path");
  });

  it("returns 501 without the public store token", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect((await POST(tokenRequest("images/a.png"))).status).toBe(501);
    expect(blob.handleUpload).not.toHaveBeenCalled();
  });
});
