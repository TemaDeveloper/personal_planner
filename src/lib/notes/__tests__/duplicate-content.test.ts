import { describe, it, expect } from "vitest";
import { collectDatabaseIds, rewriteContentIds } from "@/lib/notes/duplicate-content";

const content = [
  { type: "database", props: { databaseId: "db1" } },
  {
    type: "column",
    children: [
      { type: "subPage", props: { pageId: "pgA" } },
      { type: "database", props: { databaseId: "db2" } },
    ],
  },
  { type: "paragraph", content: [{ type: "mention", props: { pageId: "pgB", label: "x" } }] },
];

describe("collectDatabaseIds", () => {
  it("finds database ids incl. nested", () => {
    expect(collectDatabaseIds(content).sort()).toEqual(["db1", "db2"]);
  });
  it("is safe on non-arrays", () => {
    expect(collectDatabaseIds(null)).toEqual([]);
  });
});

describe("rewriteContentIds", () => {
  it("remaps database, subPage, and mention ids; leaves others", () => {
    const out = rewriteContentIds(
      content,
      { db1: "DB1", db2: "DB2" },
      { pgA: "PGA", pgB: "PGB" }
    ) as typeof content;
    expect(out[0].props!.databaseId).toBe("DB1");
    expect(out[1].children![0].props!.pageId).toBe("PGA");
    expect(out[1].children![1].props!.databaseId).toBe("DB2");
    // mention nested in paragraph content
    const mention = (out[2].content as { props: { pageId: string } }[])[0];
    expect(mention.props.pageId).toBe("PGB");
  });
  it("does not mutate the input", () => {
    const snapshot = JSON.stringify(content);
    rewriteContentIds(content, { db1: "X" }, {});
    expect(JSON.stringify(content)).toBe(snapshot);
  });
  it("leaves unmapped ids unchanged", () => {
    const out = rewriteContentIds([{ type: "database", props: { databaseId: "zzz" } }], {}, {}) as typeof content;
    expect(out[0].props!.databaseId).toBe("zzz");
  });
});
