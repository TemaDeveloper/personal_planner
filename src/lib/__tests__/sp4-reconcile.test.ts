import { describe, it, expect } from "vitest";
import { planReconciliation, rankSectionsBySalience, type SectionRef } from "@/lib/profile/reconcile";
import type { ILifeFacet } from "@/lib/models/life-profile";

const f = (key: string, dimension: string, value: string, salience: number): ILifeFacet => ({
  key,
  dimension,
  value,
  salience,
  source: "stated",
});

describe("planReconciliation", () => {
  it("proposes adding sections for new salient facets with no section", () => {
    const facets = [f("k1", "livelihood", "rideshare", 0.9), f("k2", "health", "back pain", 0.4)];
    const plan = planReconciliation(facets, []);
    // k1 is salient and uncovered → add; k2 below threshold → not added
    expect(plan.add.map((a) => a.key)).toEqual(["k1"]);
  });

  it("proposes removing a section whose driving facet disappeared", () => {
    const facets = [f("k1", "livelihood", "rideshare", 0.9)];
    const sections: SectionRef[] = [{ slug: "old-commute", sourceFacetKey: "gone", hasData: false }];
    const plan = planReconciliation(facets, sections);
    expect(plan.remove).toEqual([
      { slug: "old-commute", requiresConfirm: false, reason: expect.any(String) },
    ]);
  });

  it("flags a data-bearing removal as requiring confirmation (no silent delete)", () => {
    const sections: SectionRef[] = [{ slug: "journal", sourceFacetKey: "gone", hasData: true }];
    const plan = planReconciliation([], sections);
    expect(plan.remove[0]).toMatchObject({ slug: "journal", requiresConfirm: true });
  });

  it("keeps sections whose driving facet is still present, and reprioritizes them", () => {
    const facets = [f("k1", "livelihood", "rideshare", 0.85)];
    const sections: SectionRef[] = [{ slug: "trips", sourceFacetKey: "k1", hasData: true }];
    const plan = planReconciliation(facets, sections);
    expect(plan.keep).toContain("trips");
    expect(plan.remove).toHaveLength(0);
    expect(plan.reprioritize).toEqual([{ slug: "trips", salience: 0.85 }]);
  });

  it("never auto-touches sections with unknown origin", () => {
    const sections: SectionRef[] = [{ slug: "manual", hasData: true }];
    const plan = planReconciliation([], sections);
    expect(plan.keep).toContain("manual");
    expect(plan.remove).toHaveLength(0);
  });
});

describe("rankSectionsBySalience", () => {
  it("orders by salience desc, unknown salience last, limited", () => {
    const ranked = rankSectionsBySalience(
      [
        { slug: "b", salience: 0.5 },
        { slug: "a", salience: 0.9 },
        { slug: "c" },
        { slug: "d", salience: 0.7 },
      ],
      3
    );
    expect(ranked).toEqual(["a", "d", "b"]);
  });
});
