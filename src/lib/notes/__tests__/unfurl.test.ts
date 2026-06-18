import { describe, it, expect } from "vitest";
import { extractMeta } from "@/lib/notes/unfurl";

describe("extractMeta", () => {
  it("prefers OpenGraph tags", () => {
    const html = `
      <title>Fallback title</title>
      <meta property="og:title" content="OG Title" />
      <meta property="og:description" content="OG &amp; desc" />
      <meta property="og:image" content="https://x.com/a.png" />`;
    expect(extractMeta(html)).toEqual({
      title: "OG Title",
      description: "OG & desc",
      image: "https://x.com/a.png",
    });
  });
  it("falls back to <title> and meta description", () => {
    const html = `<title>Just A Title</title><meta name="description" content="A page" />`;
    const m = extractMeta(html);
    expect(m.title).toBe("Just A Title");
    expect(m.description).toBe("A page");
    expect(m.image).toBe("");
  });
  it("tolerates reversed attribute order", () => {
    const html = `<meta content="Reversed" property="og:title" />`;
    expect(extractMeta(html).title).toBe("Reversed");
  });
  it("returns empties for HTML with no metadata", () => {
    expect(extractMeta("<html><body>hi</body></html>")).toEqual({ title: "", description: "", image: "" });
  });
});
