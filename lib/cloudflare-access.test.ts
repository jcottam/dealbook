import { describe, expect, it } from "vitest";
import { getCloudflareAccessUserEmail, isCloudflareAccessAuthenticated } from "@/lib/cloudflare-access";

describe("cloudflare access headers", () => {
  it("reads authenticated user email", () => {
    const headers = new Headers({ "cf-access-authenticated-user-email": "lisa@example.com" });
    expect(getCloudflareAccessUserEmail(headers)).toBe("lisa@example.com");
    expect(isCloudflareAccessAuthenticated(headers)).toBe(true);
  });

  it("treats jwt assertion as authenticated", () => {
    const headers = new Headers({ "cf-access-jwt-assertion": "eyJ.test" });
    expect(getCloudflareAccessUserEmail(headers)).toBeNull();
    expect(isCloudflareAccessAuthenticated(headers)).toBe(true);
  });

  it("is false without access headers", () => {
    expect(isCloudflareAccessAuthenticated(new Headers())).toBe(false);
  });
});
