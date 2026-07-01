import { z } from "zod/v4";
import { callAI, type AIProvider } from "@/lib/ai";
import { extractJsonBlock } from "@/lib/profile/parse-json";
import type { ILifeFacet } from "@/lib/models/life-profile";

const ComputationSchema = z.object({
  kind: z.enum([
    "net",
    "pace_eta",
    "ceiling",
    "rate",
    "target_progress",
    "countdown",
    "cycle",
  ]),
  params: z.record(z.string(), z.any()),
});

const GenFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["boolean", "number", "text", "select", "date"]),
  options: z.array(z.string()).optional(),
  formula: z.string().optional(),
  computation: ComputationSchema.optional(),
});

const GenSectionSchema = z.object({
  name: z.string(),
  icon: z.string().default("Star"),
  description: z.string().default(""),
  // Open vocabulary — see views/registry. A novel value renders via fallback.
  viewType: z.string().default("weekly-cards"),
  fields: z.array(GenFieldSchema),
  layoutHtml: z.string().default(""),
});

const GenSectionsSchema = z.object({ sections: z.array(GenSectionSchema) });

export type GeneratedSection = z.infer<typeof GenSectionSchema>;

export const SECTION_GEN_SYSTEM_PROMPT = `You design bespoke planner sections for one specific person, from their life facets.

Rules:
- Create only sections that fit THIS person. Two different people should share almost nothing.
- Each section: name, icon (Lucide name), description, viewType, and fields.
- viewType is one of: weekly-cards | table | grid | board | calendar | goal-progress | streak | daily-log | schedule | trend | pipeline | budget. Pick the one that fits.
- Each field: key (snake_case), label, type (boolean|number|text|select|date), options (for select).

DERIVED VALUES — when a field is computed from other fields, attach a "computation". A computed field's own "type" is "number". params values are other field keys (or literal numbers/dates). Kinds:
- net (money after costs): {"kind":"net","params":{"add":["gross","tips"],"subtract":["fuel","depreciation"]}}
- pace_eta (ETA toward a goal at a weekly rate): {"kind":"pace_eta","params":{"target":"goal_amount","current":"saved","ratePerWeek":"weekly_rate"}}
- ceiling (a LIMIT to stay under, not a goal — energy/pain caps): {"kind":"ceiling","params":{"value":"spent","cap":"daily_cap"}}
- rate (per-unit, e.g. $/hr): {"kind":"rate","params":{"numerator":"earnings","denominator":"hours"}}
- target_progress (% toward a target): {"kind":"target_progress","params":{"current":"done","target":"goal"}}
- countdown (days until a date field): {"kind":"countdown","params":{"target":"due_date"}}
- cycle (repeating period — chemo/menstrual/crop): {"kind":"cycle","params":{"start":"cycle_start","current":"today","cycleLengthDays":21}}

Return ONLY JSON: {"sections":[{...}]}. Aim for 2-5 sections driven by the most salient facets.`;

export function facetSummary(facets: ILifeFacet[]): string {
  return facets
    .slice()
    .sort((a, b) => b.salience - a.salience)
    .map((f) => `- ${f.dimension}: ${f.value} (salience ${f.salience})`)
    .join("\n");
}

/**
 * Deterministic parse of a raw AI response into validated section specs.
 * Extracted so it can be unit-tested without a live model.
 */
export function parseSections(raw: string): GeneratedSection[] {
  const json = extractJsonBlock(raw);
  const parsed = JSON.parse(json);
  const shaped = Array.isArray(parsed) ? { sections: parsed } : parsed;
  return GenSectionsSchema.parse(shaped).sections;
}

/** Generate bespoke section specs for a person from their life facets. */
export async function generateSectionsFromFacets(
  facets: ILifeFacet[],
  provider: AIProvider,
  apiKey: string
): Promise<GeneratedSection[]> {
  const userMessage = `This person's life facets:\n${facetSummary(facets)}\n\nDesign their planner sections.`;
  const raw = await callAI(provider, apiKey, SECTION_GEN_SYSTEM_PROMPT, userMessage);
  return parseSections(raw);
}
