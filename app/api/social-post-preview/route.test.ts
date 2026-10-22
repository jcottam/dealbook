import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({ list: vi.fn(), put: vi.fn(), del: vi.fn() }));

vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  list: blob.list,
  put: blob.put,
  del: blob.del,
}));

const storage = vi.hoisted(() => ({
  listPreviewSummaries: vi.fn(),
  savePreviewPost: vi.fn(),
  readPreviewPost: vi.fn(),
  deletePreviewPost: vi.fn(),
}));

vi.mock("@/lib/social-post-preview/storage", () => storage);

const { GET, POST } = await import("@/app/api/social-post-preview/route");
const { GET: GET_ONE, PUT, DELETE } = await import("@/app/api/social-post-preview/[id]/route");

const TOKEN = "vercel_blob_rw_StoreAbc_secret";

const validBody = {
  name: "Monday post",
  platforms: ["instagram", "x"],
  media: [
    {
      pathname: "images/aaaaaaaaaa/photo.jpg",
      url: "https://example.com/photo.jpg",
      kind: "image",
      width: 1000,
      height: 1000,
    },
  ],
  instagram: { caption: "Hello world", crop: "4:5" },
  x: { text: "Hello world", crop: "original" },
};

beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/social-post-preview", () => {
  it("lists summaries", async () => {
    storage.listPreviewSummaries.mockResolvedValue([{ id: "a", name: "Post", platforms: ["x"], updatedAt: "2026-01-01T00:00:00.000Z" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [{ id: "a", name: "Post", platforms: ["x"], updatedAt: "2026-01-01T00:00:00.000Z" }],
    });
  });
});

describe("POST /api/social-post-preview", () => {
  it("rejects invalid posts", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x", platforms: ["x"], media: [], x: { text: "", crop: "original" } }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates when valid", async () => {
    storage.savePreviewPost.mockImplementation(async (p) => p);
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    expect(res.status).toBe(201);
    expect(storage.savePreviewPost).toHaveBeenCalled();
  });
});

describe("/api/social-post-preview/[id]", () => {
  it("GET returns 404 when missing", async () => {
    storage.readPreviewPost.mockResolvedValue(null);
    const res = await GET_ONE(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("DELETE removes preview folder only", async () => {
    storage.readPreviewPost.mockResolvedValue({ id: "abc", name: "n" });
    storage.deletePreviewPost.mockResolvedValue(undefined);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(200);
    expect(storage.deletePreviewPost).toHaveBeenCalledWith("abc");
  });

  it("PUT updates when valid", async () => {
    storage.readPreviewPost.mockResolvedValue({
      ...validBody,
      id: "abc",
      profileId: "dealbook",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    storage.savePreviewPost.mockImplementation(async (p) => p);
    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(200);
  });
});
