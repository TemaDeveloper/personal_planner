import type { FlatPage, TreeNode } from "@/lib/notes/types";

/** Build a nested tree from a flat page list. Siblings sorted by `order`.
 * Pages whose parent is missing become root-level (orphan safety). Cycle-safe:
 * if a parentId chain forms a loop (e.g. corrupted data from a crafted request),
 * the affected pages are promoted to root rather than vanishing or looping. */
export function buildPageTree(pages: FlatPage[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const p of pages) byId.set(p.id, { ...p, children: [] });

  // Attach each node to its parent — but only if doing so would NOT form a
  // cycle (walk up the parent chain; if it reaches this node, the edge is part
  // of a loop, so root the node instead). This keeps the output tree acyclic so
  // consumers (React render, traversal) can't infinite-loop on corrupted data.
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    let cyclic = false;
    const guard = new Set<string>();
    let cur: string | null | undefined = node.parentId;
    while (cur) {
      if (cur === node.id) { cyclic = true; break; }
      if (guard.has(cur)) break; // a pre-existing loop higher up; stop walking
      guard.add(cur);
      cur = byId.get(cur)?.parentId ?? null;
    }
    const parent = !cyclic && node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}
