import { describe, it, expect } from "vitest";
import { blocksToMarkdown, databaseToMarkdown, collectDatabaseIds } from "@/lib/notes/blocks-to-markdown";

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

describe("databaseToMarkdown + database block export", () => {
  const db = {
    title: "Tasks",
    properties: [
      { id: "t", name: "Name", type: "title" },
      { id: "s", name: "Status", type: "status" },
      { id: "d", name: "Done", type: "checkbox" },
    ],
    rows: [
      { id: "r1", cells: { t: "Ship it", s: "Done", d: true } },
      { id: "r2", cells: { t: "Plan", s: "To Do" } },
    ],
  };
  it("renders a GFM table with headers and rows", () => {
    const md = databaseToMarkdown(db);
    expect(md).toContain("**Tasks**");
    expect(md).toContain("| Name | Status | Done |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| Ship it | Done | ✓ |");
    expect(md).toContain("| Plan | To Do |  |");
  });
  it("collectDatabaseIds finds database blocks (incl. nested)", () => {
    const content = [
      { type: "database", props: { databaseId: "db1" } },
      { type: "column", children: [{ type: "database", props: { databaseId: "db2" } }] },
      { type: "paragraph", content: [] },
    ];
    expect(collectDatabaseIds(content).sort()).toEqual(["db1", "db2"]);
  });
  it("blocksToMarkdown inlines a database block's table via the map", () => {
    const content = [{ type: "database", props: { databaseId: "db1" } }];
    const md = blocksToMarkdown(content, { db1: db });
    expect(md).toContain("| Name | Status | Done |");
  });
});
