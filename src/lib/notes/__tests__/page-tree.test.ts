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
  it("does not loop or drop pages on a parentId cycle (every page still appears)", () => {
    const tree = buildPageTree([p("a", "b"), p("b", "a"), p("c", null), p("d", "c")]);
    // Collect every id reachable in the returned tree.
    const all = new Set<string>();
    const walk = (ns: typeof tree) => ns.forEach((n) => { all.add(n.id); walk(n.children); });
    walk(tree);
    expect(all).toEqual(new Set(["a", "b", "c", "d"])); // none dropped, no infinite loop
    expect(tree.find((n) => n.id === "c")?.children.map((n) => n.id)).toEqual(["d"]);
  });
  it("does not loop on a self-parent cycle", () => {
    const tree = buildPageTree([p("s", "s"), p("r", null)]);
    expect(tree.map((n) => n.id).sort()).toEqual(["r", "s"]);
  });
});
