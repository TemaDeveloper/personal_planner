import type { ILifeFacet } from "@/lib/models/life-profile";

/** Provenance precedence: a directly stated fact outranks an inferred one. */
const RANK: Record<ILifeFacet["source"], number> = { inferred: 1, asked: 2, stated: 3 };

export function normalizeDimension(dimension: string): string {
  return dimension.trim().toLowerCase();
}

function strongerSource(
  a: ILifeFacet["source"],
  b: ILifeFacet["source"]
): ILifeFacet["source"] {
  return RANK[a] >= RANK[b] ? a : b;
}

/**
 * Merge newly extracted facets into an existing profile (living brain).
 * Same key → update salience (latest wins) and keep the stronger provenance.
 * New key → append. Superseded *values* are reconciled later in SP-4, not here.
 */
export function mergeFacets(existing: ILifeFacet[], incoming: ILifeFacet[]): ILifeFacet[] {
  const byKey = new Map<string, ILifeFacet>();
  for (const f of existing) byKey.set(f.key, { ...f });

  for (const inc of incoming) {
    const prev = byKey.get(inc.key);
    if (prev) {
      byKey.set(inc.key, {
        ...prev,
        salience: inc.salience,
        source: strongerSource(prev.source, inc.source),
      });
    } else {
      byKey.set(inc.key, { ...inc });
    }
  }
  return [...byKey.values()];
}

/** Distinct dimensions present in a facet list (normalized). */
export function distinctDimensions(facets: ILifeFacet[]): string[] {
  return [...new Set(facets.map((f) => normalizeDimension(f.dimension)))];
}
