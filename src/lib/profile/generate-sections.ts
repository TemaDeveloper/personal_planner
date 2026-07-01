import { z } from "zod/v4";
import { callAI, type AIProvider } from "@/lib/ai";
import { extractJsonBlock } from "@/lib/profile/parse-json";
import type { ILifeFacet } from "@/lib/models/life-profile";

const ComputationSchema = z.object({
  kind: z.enum(["net", "pace_eta", "ceiling"]),
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
  viewType: z.enum(["weekly-cards", "table", "grid", "board", "calendar"]).default("weekly-cards"),
  fields: z.array(GenFieldSchema),
  layoutHtml: z.string().default(""),
});

const GenSectionsSchema = z.object({ sections: z.array(GenSectionSchema) });

export type GeneratedSection = z.infer<typeof GenSectionSchema>;

export const SECTION_GEN_SYSTEM_PROMPT = `You design bespoke planner sections for one specific person, from their life facets.

Rules:
- Create only sections that fit THIS person. Two different people should share almost nothing.
- Each section: name, icon (Lucide name), description, viewType (weekly-cards|table|grid|board|calendar), and fields.
- Each field: key (snake_case), label, type (boolean|number|text|select|date), options (for select).

DERIVED VALUES — when a field is computed from other fields, attach a "computation":
- Money net after costs: {"kind":"net","params":{"add":["gross","tips"],"subtract":["fuel","depreciation"]}}
- Progress/ETA toward a goal at a weekly rate: {"kind":"pace_eta","params":{"target":"goal_amount","current":"saved","ratePerWeek":"weekly_rate"}}
- A limit to STAY UNDER (not a goal to maximise), e.g. energy/pain caps: {"kind":"ceiling","params":{"value":"spent","cap":"daily_cap"}}
Only use these three kinds. params values are other field keys (or literal numbers). A computed field's own "type" should be "number".

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
