import type { FlatPage } from "@/lib/notes/types";

/** The root→current chain of pages (inclusive). Empty if the page is unknown.
 * Cycle-safe: a broken parent loop stops once a page is revisited. */
export function pageAncestors(pages: FlatPage[], pageId: string): FlatPage[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const chain: FlatPage[] = [];
  const seen = new Set<string>();
  let cur = byId.get(pageId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.push(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain.reverse();
}
