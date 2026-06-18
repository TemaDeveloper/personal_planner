import { describe, it, expect } from "vitest";
import { katexHtml } from "@/lib/notes/katex-html";

describe("katexHtml", () => {
  it("returns empty string for blank input", () => {
    expect(katexHtml("")).toBe("");
    expect(katexHtml("   ")).toBe("");
  });
  it("renders LaTeX to KaTeX markup", () => {
    const html = katexHtml("x^2 + 1");
    expect(html).toContain("katex");
    expect(html.length).toBeGreaterThan(0);
  });
  it("does not throw on invalid LaTeX (renders an error span)", () => {
    expect(() => katexHtml("\\frac{")).not.toThrow();
  });
});
