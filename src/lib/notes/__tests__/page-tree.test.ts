import { describe, it, expect } from "vitest";
import { buildPageTree } from "@/lib/notes/page-tree";
import type { FlatPage } from "@/lib/notes/types";

const p = (id: string, parentId: string | null, order = 0, title = id): FlatPage => ({
  id, parentId, order, title, icon: "📄",
});

describe("buildPageTree", () => {
  it("nests children under parents", () => {
    const tree = buildPageTree([p("a", null), p("b", "a"), p("c", "a")]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("a");
    expect(tree[0].children.map((n) => n.id)).toEqual(["b", "c"]);
  });
  it("sorts siblings by order then keeps stable", () => {
    const tree = buildPageTree([p("a", null, 2), p("b", null, 1), p("c", null, 3)]);
    expect(tree.map((n) => n.id)).toEqual(["b", "a", "c"]);
  });
  it("treats a page with an unresolved parent as root (orphan safety)", () => {
    const tree = buildPageTree([p("x", "missing")]);
    expect(tree.map((n) => n.id)).toEqual(["x"]);
  });
});
