import { describe, it, expect } from "vitest";
import { blocksToMarkdown } from "@/lib/notes/blocks-to-markdown";

describe("blocksToMarkdown", () => {
  it("serializes headings, paragraphs, and inline styles", () => {
    const md = blocksToMarkdown([
      { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Title" }] },
      { type: "paragraph", content: [
        { type: "text", text: "plain " },
        { type: "text", text: "bold", styles: { bold: true } },
        { type: "text", text: " and ", styles: {} },
        { type: "text", text: "code", styles: { code: true } },
      ] },
    ]);
    expect(md).toContain("## Title");
    expect(md).toContain("plain **bold** and `code`");
  });

  it("serializes nested lists, quotes, callouts, code, and dividers", () => {
    const md = blocksToMarkdown([
      { type: "bulletListItem", content: [{ type: "text", text: "parent" }], children: [
        { type: "bulletListItem", content: [{ type: "text", text: "child" }] },
      ] },
      { type: "checkListItem", props: { checked: true }, content: [{ type: "text", text: "done" }] },
      { type: "quote", content: [{ type: "text", text: "wise words" }] },
      { type: "callout", props: { emoji: "💡" }, content: [{ type: "text", text: "tip" }] },
      { type: "codeBlock", props: { language: "ts" }, content: [{ type: "text", text: "const x = 1" }] },
      { type: "divider" },
    ]);
    expect(md).toContain("- parent");
    expect(md).toContain("  - child");
    expect(md).toContain("- [x] done");
    expect(md).toContain("> wise words");
    expect(md).toContain("> 💡 tip");
    expect(md).toContain("```ts");
    expect(md).toContain("const x = 1");
    expect(md).toContain("---");
  });

  it("serializes links and bookmarks", () => {
    const md = blocksToMarkdown([
      { type: "paragraph", content: [{ type: "link", href: "https://x.io", content: [{ type: "text", text: "X" }] }] },
      { type: "bookmark", props: { url: "https://y.io", title: "Y" } },
    ]);
    expect(md).toContain("[X](https://x.io)");
    expect(md).toContain("[Y](https://y.io)");
  });

  it("returns empty for non-array input", () => {
    expect(blocksToMarkdown(null)).toBe("");
    expect(blocksToMarkdown("nope")).toBe("");
  });
});
