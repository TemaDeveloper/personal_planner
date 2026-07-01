import { z } from "zod/v4";
import { callAI, type AIProvider } from "@/lib/ai";
import { extractJsonBlock } from "@/lib/profile/parse-json";
import type { ILifeFacet } from "@/lib/models/life-profile";

const coerceNum = z.union([z.number(), z.string().transform(Number)]).pipe(z.number());

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

const FacetSchema = z.object({
  key: z.string().optional(),
  dimension: z.string().min(1),
  value: z.string().min(1),
  salience: coerceNum.pipe(z.number().min(0).max(1)).default(0.5),
  source: z.enum(["asked", "inferred", "stated"]).default("inferred"),
});

const FacetsSchema = z.object({ facets: z.array(FacetSchema) });

export const FACET_SYSTEM_PROMPT = `You extract a person's "life facets" from a short free-text description of their life.

A facet is one concrete fact about how they live that could shape their planner.
The vocabulary is OPEN — invent a dimension label whenever the common ones don't fit.
Common dimensions (use when they apply, but you are NOT limited to them):
livelihood, mobility, time-structure, movement, health, learning, home, people, money, craft, values, big-arc.

For each facet output:
- dimension: short lowercase label (open vocabulary)
- value: the specific fact (e.g. "per-trip rideshare income", "cycles everywhere, owns no car")
- salience: 0..1 — how central this is to their daily life (1 = defines their days)
- source: "stated" if they said it directly, "inferred" if you deduced it

Return ONLY JSON: {"facets":[{"dimension":"...","value":"...","salience":0.9,"source":"stated"}, ...]}
Aim for 5-12 facets. Do not invent facts not supported by the description.`;

/**
 * Deterministic parse of a raw AI response into validated facets.
 * Extracted so it can be unit-tested without a live model.
 */
export function parseFacets(raw: string): ILifeFacet[] {
  const json = extractJsonBlock(raw);
  const parsed = JSON.parse(json);
  const shaped = Array.isArray(parsed) ? { facets: parsed } : parsed;
  const { facets } = FacetsSchema.parse(shaped);
  return facets.map((f) => ({
    key: f.key && f.key.length > 0 ? f.key : slug(`${f.dimension}-${f.value}`),
    dimension: f.dimension,
    value: f.value,
    salience: f.salience,
    source: f.source,
  }));
}

/** Extract life facets from a free-text life description via the given AI provider. */
export async function extractFacets(
  input: string,
  provider: AIProvider,
  apiKey: string
): Promise<ILifeFacet[]> {
  const raw = await callAI(provider, apiKey, FACET_SYSTEM_PROMPT, input);
  return parseFacets(raw);
}
