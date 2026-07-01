import type { ILifeFacet } from "@/lib/models/life-profile";
import { normalizeDimension } from "@/lib/profile/merge";

/**
 * Learn-back for the facet vocabulary: track how often each dimension is seen
 * so common ones become cheap priors while novel ones are still recorded.
 * (Exact-string dedup here; embedding-similarity dedup mirrors embeddings.ts
 * and is applied in the DB layer.)
 */
export function recordDimensions(
  counts: Record<string, number>,
  facets: ILifeFacet[]
): Record<string, number> {
  const next = { ...counts };
  for (const f of facets) {
    const dim = normalizeDimension(f.dimension);
    next[dim] = (next[dim] ?? 0) + 1;
  }
  return next;
}

/** Is this dimension already in the known vocabulary, or genuinely novel? */
export function classifyDimension(dimension: string, known: string[]): "known" | "novel" {
  const norm = normalizeDimension(dimension);
  return known.map(normalizeDimension).includes(norm) ? "known" : "novel";
}

/** The dimensions in `facets` that are not yet in the known vocabulary. */
export function novelDimensions(facets: ILifeFacet[], known: string[]): string[] {
  const knownNorm = new Set(known.map(normalizeDimension));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of facets) {
    const dim = normalizeDimension(f.dimension);
    if (!knownNorm.has(dim) && !seen.has(dim)) {
      seen.add(dim);
      out.push(dim);
    }
  }
  return out;
}
