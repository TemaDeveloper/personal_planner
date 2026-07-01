import { callAI, type AIProvider } from "@/lib/ai";
import { extractJsonBlock } from "@/lib/profile/parse-json";
import type { ILifeFacet } from "@/lib/models/life-profile";

const SOURCES = ["asked", "inferred", "stated"] as const;
const MAX_FACETS = 40;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function coerceSalience(v: unknown): number {
  let n = 0.5;
  if (typeof v === "number" && Number.isFinite(v)) n = v;
  else if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) n = Number(v);
  return Math.max(0, Math.min(1, n)); // clamp; a 1-5/1-10 scale collapses to "high", never throws
}

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
 * Lenient, deterministic parse of a raw AI response into facets. Repairs
 * imperfect output (clamps salience, defaults source, backfills keys) and skips
 * facets missing a dimension/value — never throws, so a single bad facet can't
 * 500 the onboarding turn.
 */
export function parseFacets(raw: string): ILifeFacet[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonBlock(raw));
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as { facets?: unknown })?.facets;
  if (!Array.isArray(arr)) return [];

  const out: ILifeFacet[] = [];
  for (const item of arr.slice(0, MAX_FACETS)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const dimension = typeof r.dimension === "string" ? r.dimension.trim() : "";
    const value =
      typeof r.value === "string"
        ? r.value.trim()
        : r.value != null
          ? String(r.value)
          : "";
    if (!dimension || !value) continue;
    const source = SOURCES.includes(r.source as (typeof SOURCES)[number])
      ? (r.source as ILifeFacet["source"])
      : "inferred";
    const key = typeof r.key === "string" && r.key.length > 0 ? r.key : slug(`${dimension}-${value}`);
    out.push({ key, dimension, value, salience: coerceSalience(r.salience), source });
  }
  return out;
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
