import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const blob = vi.hoisted(() => ({
  issueSignedToken: vi.fn(),
  handleUploadPresigned: vi.fn(),
}));

vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  issueSignedToken: blob.issueSignedToken,
}));

vi.mock("@vercel/blob/client", () => ({
  handleUploadPresigned: blob.handleUploadPresigned,
}));

const STORE_ID = "store_private";
const WEBHOOK_KEY = "-----BEGIN PUBLIC KEY-----\nTEST\n-----END PUBLIC KEY-----";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const presignRequest = (pathname: string) =>
  jsonRequest({
    type: "blob.generate-presigned-url",
    payload: { pathname, multipart: false, clientPayload: null },
  });

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BLOB_STORE_ID", STORE_ID);
    vi.stubEnv("BLOB_WEBHOOK_PUBLIC_KEY", WEBHOOK_KEY);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_public_token");
  });

  it("issues a put-scoped signed token for private uploads/", async () => {
    const signed = { delegationToken: "d", clientSigningToken: "c" };
    blob.issueSignedToken.mockResolvedValue(signed);
    blob.handleUploadPresigned.mockImplementation(async ({ body, getSignedToken }) => {
      const issued = await getSignedToken(body.payload.pathname, null, false);
      return { type: body.type, issued };
    });

    const res = await POST(presignRequest("uploads/clip.mp4"));
    expect(res.status).toBe(200);
    expect(blob.issueSignedToken).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "uploads/clip.mp4",
        operations: ["put"],
        allowedContentTypes: ["video/*"],
        maximumSizeInBytes: 5 * 1024 ** 3,
      }),
    );
    const { issued } = await res.json();
    expect(issued.token).toEqual(signed);
    expect(issued.urlOptions).toEqual(
      expect.objectContaining({
        allowedContentTypes: ["video/*"],
        addRandomSuffix: true,
        allowOverwrite: false,
      }),
    );
  });

  it("rejects paths outside uploads/", async () => {
    blob.handleUploadPresigned.mockImplementation(async ({ body, getSignedToken }) =>
      getSignedToken(body.payload.pathname, null, false),
    );
    for (const pathname of ["images/a/a.mp4", "clips/x/a.mp4", "uploads/", "../uploads/x.mp4"]) {
      const res = await POST(presignRequest(pathname));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Invalid upload path");
    }
    expect(blob.issueSignedToken).not.toHaveBeenCalled();
  });

  it("returns 501 without the private store env", async () => {
    vi.stubEnv("BLOB_STORE_ID", "");
    expect((await POST(presignRequest("uploads/a.mp4"))).status).toBe(501);
    expect(blob.handleUploadPresigned).not.toHaveBeenCalled();
  });

  it("returns 501 without the webhook public key", async () => {
    vi.stubEnv("BLOB_WEBHOOK_PUBLIC_KEY", "");
    expect((await POST(presignRequest("uploads/a.mp4"))).status).toBe(501);
    expect(blob.handleUploadPresigned).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    expect((await POST(jsonRequest("{"))).status).toBe(400);
  });
});
