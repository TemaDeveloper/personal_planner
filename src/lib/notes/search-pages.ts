import type { FlatPage } from "@/lib/notes/types";

/** Case-insensitive title search. Empty query returns the first `limit` pages.
 * Matches are ranked: title starts-with the query before title contains it. */
export function searchPages(pages: FlatPage[], query: string, limit = 50): FlatPage[] {
  const q = query.trim().toLowerCase();
  if (!q) return pages.slice(0, limit);
  const scored: { page: FlatPage; score: number }[] = [];
  for (const p of pages) {
    const t = (p.title || "Untitled").toLowerCase();
    if (t.startsWith(q)) scored.push({ page: p, score: 0 });
    else if (t.includes(q)) scored.push({ page: p, score: 1 });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.page);
}
