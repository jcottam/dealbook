import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isMediaUtilsAdmin, isMediaUtilsAdminEmail } from "@/lib/media-utils-admins";

describe("isMediaUtilsAdminEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes core admin jcottam@gmail.com", () => {
    expect(isMediaUtilsAdminEmail("jcottam@gmail.com")).toBe(true);
    expect(isMediaUtilsAdminEmail(" Jcottam@Gmail.com ")).toBe(true);
  });

  it("includes emails from env roster", () => {
    vi.stubEnv("MEDIA_UTILS_ADMIN_EMAILS", "lisa@example.com, ops@example.com");
    expect(isMediaUtilsAdminEmail("lisa@example.com")).toBe(true);
    expect(isMediaUtilsAdminEmail("other@example.com")).toBe(false);
  });
});

describe("isMediaUtilsAdmin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false without Access headers", () => {
    expect(isMediaUtilsAdmin(new Headers())).toBe(false);
  });

  it("allows any authenticated user when env roster is empty", () => {
    const headers = new Headers({ "cf-access-authenticated-user-email": "lisa@example.com" });
    expect(isMediaUtilsAdmin(headers)).toBe(true);
  });

  it("allows core admin when roster is restricted", () => {
    vi.stubEnv("MEDIA_UTILS_ADMIN_EMAILS", "lisa@example.com");
    const headers = new Headers({ "cf-access-authenticated-user-email": "jcottam@gmail.com" });
    expect(isMediaUtilsAdmin(headers)).toBe(true);
  });

  it("respects env roster when set", () => {
    vi.stubEnv("MEDIA_UTILS_ADMIN_EMAILS", "lisa@example.com");
    const allowed = new Headers({ "cf-access-authenticated-user-email": "lisa@example.com" });
    const denied = new Headers({ "cf-access-authenticated-user-email": "reviewer@example.com" });
    expect(isMediaUtilsAdmin(allowed)).toBe(true);
    expect(isMediaUtilsAdmin(denied)).toBe(false);
  });
});
