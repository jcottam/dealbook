import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const comments = vi.hoisted(() => ({
  listPreviewComments: vi.fn(),
  addPreviewComment: vi.fn(),
}));

vi.mock("@/lib/social-post-preview/comments", () => comments);

const { GET, POST } = await import("@/app/api/social-post-preview/[id]/comments/route");

const TOKEN = "vercel_blob_rw_StoreAbc_secret";
const ctx = { params: Promise.resolve({ id: "abc123" }) };

beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/social-post-preview/[id]/comments", () => {
  it("returns 404 when preview missing", async () => {
    comments.listPreviewComments.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns comments", async () => {
    comments.listPreviewComments.mockResolvedValue([
      { id: "1", author: "Sam", text: "Looks good", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      comments: [{ id: "1", author: "Sam", text: "Looks good", createdAt: "2026-01-01T00:00:00.000Z" }],
    });
  });
});

describe("POST /api/social-post-preview/[id]/comments", () => {
  it("requires name and text", async () => {
    comments.addPreviewComment.mockResolvedValue({ ok: false, status: 400, error: "Name is required." });
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "", text: "hi" }),
      }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("creates comment", async () => {
    const comment = { id: "99", author: "Sam", text: "Fix crop", createdAt: "2026-01-02T00:00:00.000Z" };
    comments.addPreviewComment.mockResolvedValue({ ok: true, comment });
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "Sam", text: "Fix crop" }),
      }),
      ctx,
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ comment });
  });

  it("ignores honeypot submissions", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "Bot", text: "spam", website: "http://spam.test" }),
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(comments.addPreviewComment).not.toHaveBeenCalled();
  });
});
