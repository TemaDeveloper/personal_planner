import { describe, it, expect } from "vitest";
import { isBareUrl } from "@/lib/notes/is-bare-url";

describe("isBareUrl", () => {
  it("accepts a single http(s) URL", () => {
    expect(isBareUrl("https://example.com")).toBe(true);
    expect(isBareUrl("http://sub.example.com/path?q=1")).toBe(true);
    expect(isBareUrl("  https://example.com/x  ")).toBe(true);
  });

  it("rejects URLs embedded in surrounding text", () => {
    expect(isBareUrl("see https://example.com")).toBe(false);
    expect(isBareUrl("https://example.com now")).toBe(false);
  });

  it("rejects non-URLs and non-http schemes", () => {
    expect(isBareUrl("")).toBe(false);
    expect(isBareUrl("example.com")).toBe(false);
    expect(isBareUrl("ftp://example.com")).toBe(false);
    expect(isBareUrl("mailto:a@b.com")).toBe(false);
    expect(isBareUrl("https://localhost")).toBe(false);
  });
});
