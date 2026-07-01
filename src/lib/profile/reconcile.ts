import type { ILifeFacet } from "@/lib/models/life-profile";

/** A section as the reconciler sees it: what facet drove it, does it hold data. */
export interface SectionRef {
  slug: string;
  sourceFacetKey?: string;
  hasData: boolean;
}

export interface ReconcilePlan {
  /** salient facets with no section yet → propose generating one */
  add: { key: string; dimension: string; value: string; salience: number }[];
  /** sections whose driving facet is gone → propose removing (guarded if data) */
  remove: { slug: string; requiresConfirm: boolean; reason: string }[];
  /** sections that stay */
  keep: string[];
  /** kept sections with their (possibly changed) driving salience, for dashboard */
  reprioritize: { slug: string; salience: number }[];
}

/**
 * State-based reconciliation: compare the desired set implied by the CURRENT
 * facets against the existing sections. Sections with no known source facet are
 * never auto-touched. Removals that would destroy data require confirmation —
 * the living brain adapts, but never silently deletes months of entries.
 */
export function planReconciliation(
  facets: ILifeFacet[],
  sections: SectionRef[],
  opts: { salienceThreshold?: number } = {}
): ReconcilePlan {
  const threshold = opts.salienceThreshold ?? 0.6;
  const facetByKey = new Map(facets.map((f) => [f.key, f]));
  const coveredKeys = new Set(
    sections.map((s) => s.sourceFacetKey).filter((k): k is string => Boolean(k))
  );

  const add = facets
    .filter((f) => f.salience >= threshold && !coveredKeys.has(f.key))
    .map((f) => ({ key: f.key, dimension: f.dimension, value: f.value, salience: f.salience }));

  const remove: ReconcilePlan["remove"] = [];
  const keep: string[] = [];
  const reprioritize: ReconcilePlan["reprioritize"] = [];

  for (const s of sections) {
    if (!s.sourceFacetKey) {
      keep.push(s.slug); // manual / unknown origin — leave alone
      continue;
    }
    const facet = facetByKey.get(s.sourceFacetKey);
    if (facet) {
      keep.push(s.slug);
      reprioritize.push({ slug: s.slug, salience: facet.salience });
    } else {
      remove.push({
        slug: s.slug,
        requiresConfirm: s.hasData,
        reason: "the life facet that created this section is gone",
      });
    }
  }

  return { add, remove, keep, reprioritize };
}

/**
 * Salience-driven dashboard: order sections by their driving facet's salience
 * (unknown-origin sections sink to the bottom), returning the top `limit` slugs.
 */
export function rankSectionsBySalience(
  sections: { slug: string; salience?: number }[],
  limit = 6
): string[] {
  return [...sections]
    .sort((a, b) => (b.salience ?? 0) - (a.salience ?? 0) || a.slug.localeCompare(b.slug))
    .slice(0, limit)
    .map((s) => s.slug);
}
