import { describe, it, expect } from "vitest";
import { collectHeadings } from "@/lib/notes/toc";

describe("collectHeadings", () => {
  it("extracts headings with id, level, and text in order", () => {
    const blocks = [
      { id: "h1", type: "heading", props: { level: 1 }, content: [{ type: "text", text: "Intro" }] },
      { id: "p1", type: "paragraph", content: [{ type: "text", text: "body" }] },
      { id: "h2", type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Details" }] },
    ];
    expect(collectHeadings(blocks)).toEqual([
      { id: "h1", level: 1, text: "Intro" },
      { id: "h2", level: 2, text: "Details" },
    ]);
  });
  it("skips empty-text headings", () => {
    const blocks = [{ id: "h", type: "heading", props: { level: 1 }, content: [] }];
    expect(collectHeadings(blocks)).toEqual([]);
  });
  it("handles string content and missing level (defaults to 1)", () => {
    const blocks = [{ id: "h", type: "heading", content: "Title" }];
    expect(collectHeadings(blocks)).toEqual([{ id: "h", level: 1, text: "Title" }]);
  });
  it("ignores malformed entries", () => {
    expect(collectHeadings([null, 42, {}, { type: "heading" }])).toEqual([]);
  });
});
