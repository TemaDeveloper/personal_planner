import { describe, it, expect } from "vitest";
import { blocksToText, snippetAround } from "@/lib/notes/blocks-to-text";

const DOC = [
  { type: "heading", content: [{ type: "text", text: "Project plan" }] },
  {
    type: "bulletListItem",
    content: [{ type: "text", text: "Ship the " }, { type: "text", text: "search feature" }],
    children: [
      { type: "paragraph", content: [{ type: "text", text: "due Friday" }] },
    ],
  },
  { type: "paragraph", content: [{ type: "mention", props: {}, label: "Roadmap" }] },
];

describe("blocksToText", () => {
  it("flattens nested blocks, runs, and children into one string", () => {
    const text = blocksToText(DOC);
    expect(text).toBe("Project plan Ship the search feature due Friday Roadmap");
  });

  it("is resilient to null/empty/non-object input", () => {
    expect(blocksToText(null)).toBe("");
    expect(blocksToText([])).toBe("");
    expect(blocksToText("nope")).toBe("");
  });
});

describe("snippetAround", () => {
  it("returns context around the first match with ellipses", () => {
    const s = snippetAround("alpha beta gamma delta epsilon", "gamma", 6);
    expect(s.toLowerCase()).toContain("gamma");
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
  });

  it("falls back to a prefix when there is no match", () => {
    expect(snippetAround("hello world", "zzz", 100)).toBe("hello world");
  });
});
