import { describe, expect, it } from "vitest";
import { defaultProfileId, getSocialProfile } from "@/lib/social-profiles";

describe("getSocialProfile", () => {
  it("returns dealbook by default", () => {
    expect(getSocialProfile(undefined).id).toBe(defaultProfileId);
    expect(getSocialProfile("unknown").id).toBe(defaultProfileId);
  });

  it("returns dealbook when requested", () => {
    expect(getSocialProfile("dealbook").instagram.handle).toBe("nytdealbook");
  });
});
