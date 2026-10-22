import { describe, expect, it } from "vitest";
import { newestPostPathname } from "@/lib/social-post-preview/storage";

describe("newestPostPathname", () => {
  it("picks the highest timestamp", () => {
    const paths = [
      "previews/abc/post-100.json",
      "previews/abc/post-200.json",
      "previews/abc/post-50.json",
    ];
    expect(newestPostPathname(paths)).toBe("previews/abc/post-200.json");
  });
});
