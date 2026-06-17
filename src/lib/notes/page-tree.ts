import type { FlatPage, TreeNode } from "@/lib/notes/types";

/** Build a nested tree from a flat page list. Siblings sorted by `order`.
 * Pages whose parent is missing become root-level (orphan safety). */
export function buildPageTree(pages: FlatPage[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const p of pages) byId.set(p.id, { ...p, children: [] });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
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
