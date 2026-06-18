import { describe, it, expect } from "vitest";
import { pageAncestors } from "@/lib/notes/breadcrumbs";
import type { FlatPage } from "@/lib/notes/types";

const p = (id: string, parentId: string | null): FlatPage => ({ id, parentId, title: id, icon: "📄", order: 0 });

describe("pageAncestors", () => {
  it("returns the root→current chain (inclusive)", () => {
    const pages = [p("a", null), p("b", "a"), p("c", "b")];
    expect(pageAncestors(pages, "c").map((n) => n.id)).toEqual(["a", "b", "c"]);
  });
  it("returns just the page for a root page", () => {
    expect(pageAncestors([p("a", null)], "a").map((n) => n.id)).toEqual(["a"]);
  });
  it("returns empty for an unknown page", () => {
    expect(pageAncestors([p("a", null)], "missing")).toEqual([]);
  });
  it("is cycle-safe (broken parent loop)", () => {
    const pages = [p("a", "b"), p("b", "a")];
    const chain = pageAncestors(pages, "a").map((n) => n.id);
    expect(chain[chain.length - 1]).toBe("a");
    expect(chain.length).toBeLessThanOrEqual(2);
  });
});
