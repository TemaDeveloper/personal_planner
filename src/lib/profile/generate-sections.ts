import { callAI, type AIProvider } from "@/lib/ai";
import { extractJsonBlock } from "@/lib/profile/parse-json";
import { ICON_NAMES, ICON_NAME_SET } from "@/lib/icon-names";
import type { ILifeFacet } from "@/lib/models/life-profile";
import type { FieldComputation } from "@/lib/compute/primitives";

export interface GeneratedField {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  formula?: string;
  computation?: FieldComputation;
}

export interface GeneratedSection {
  name: string;
  icon: string;
  description: string;
  /** Open vocabulary — see views/registry. A novel value renders via fallback. */
  viewType: string;
  /** The facet dimension this section primarily serves (for reconciliation). */
  sourceDimension?: string;
  fields: GeneratedField[];
  layoutHtml: string;
}

export const SECTION_GEN_SYSTEM_PROMPT = `You design bespoke planner sections for one specific person, from their life facets.

Rules:
- Create only sections that fit THIS person. Two different people should share almost nothing.
- Each section: name, icon, description, viewType, sourceDimension (the facet dimension this section primarily serves), and fields.
- icon MUST be exactly one of these names (pick the most fitting; do NOT invent others): ${ICON_NAMES.join(", ")}.
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

/**
 * The key of the most salient facet in a given dimension — the facet a section
 * for that dimension is considered to be driven by (SP-4 reconciliation).
 */
export function pickSourceFacetKey(
  dimension: string | undefined,
  facets: ILifeFacet[]
): string | undefined {
  if (!dimension) return undefined;
  const norm = dimension.trim().toLowerCase();
  const matches = facets
    .filter((f) => f.dimension.trim().toLowerCase() === norm)
    .sort((a, b) => b.salience - a.salience);
  return matches[0]?.key;
}

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
const FIELD_TYPES = ["boolean", "number", "text", "select", "date"] as const;
const TYPE_SYNONYMS: Record<string, (typeof FIELD_TYPES)[number]> = {
  string: "text", str: "text", textarea: "text", int: "number", integer: "number",
  float: "number", double: "number", currency: "number", checkbox: "boolean",
  bool: "boolean", toggle: "boolean", dropdown: "select", enum: "select",
  datetime: "date", time: "date",
};
const COMPUTATION_KINDS = [
  "net", "pace_eta", "ceiling", "rate", "target_progress", "countdown", "cycle", "formula",
];

function slugKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").slice(0, 48);
}

function coerceType(t: unknown): (typeof FIELD_TYPES)[number] {
  const s = String(t ?? "").toLowerCase();
  if ((FIELD_TYPES as readonly string[]).includes(s)) return s as (typeof FIELD_TYPES)[number];
  return TYPE_SYNONYMS[s] ?? "text";
}

function normalizeField(f: unknown): GeneratedSection["fields"][number] | null {
  if (!f || typeof f !== "object") return null;
  const r = f as Record<string, unknown>;
  const label = r.label ?? r.name ?? r.key;
  const key = r.key ?? (label != null ? slugKey(String(label)) : null);
  if (!key) return null;
  const field: GeneratedSection["fields"][number] = {
    key: slugKey(String(key)) || "field",
    label: String(label ?? key),
    type: coerceType(r.type),
  };
  if (Array.isArray(r.options)) field.options = r.options.map(String);
  if (typeof r.formula === "string") field.formula = r.formula;
  const comp = r.computation as Record<string, unknown> | undefined;
  if (comp && typeof comp === "object" && COMPUTATION_KINDS.includes(String(comp.kind))) {
    const params = comp.params;
    if (params && typeof params === "object") {
      field.computation = {
        kind: comp.kind as FieldComputation["kind"],
        params: params as Record<string, unknown>,
      };
    }
  }
  return field;
}

function normalizeSection(s: unknown): GeneratedSection | null {
  if (!s || typeof s !== "object") return null;
  const r = s as Record<string, unknown>;
  const name = r.name ?? r.title;
  if (!name) return null;
  const rawFields = Array.isArray(r.fields) ? r.fields.slice(0, 40) : [];
  const seenKeys = new Set<string>();
  const fields: GeneratedSection["fields"] = [];
  for (const rf of rawFields) {
    const nf = normalizeField(rf);
    if (!nf) continue;
    // De-dup keys so two fields (e.g. "Net $" and "Net %" → "net") don't clobber
    // the same entry-data slot.
    let key = nf.key;
    let n = 2;
    while (seenKeys.has(key)) key = `${nf.key}_${n++}`;
    seenKeys.add(key);
    nf.key = key;
    fields.push(nf);
  }
  if (fields.length === 0) return null; // a section with no usable fields is useless
  return {
    name: String(name),
    // Only names the app can render; anything else would silently show a Star.
    icon: typeof r.icon === "string" && ICON_NAME_SET.has(r.icon) ? r.icon : "Star",
    description: typeof r.description === "string" ? r.description : "",
    viewType: typeof r.viewType === "string" ? r.viewType : "weekly-cards",
    sourceDimension: typeof r.sourceDimension === "string" ? r.sourceDimension : undefined,
    fields,
    layoutHtml: typeof r.layoutHtml === "string" ? r.layoutHtml : "",
  };
}

/**
 * Lenient parse: repair imperfect model output rather than reject it. Coerces
 * field types, backfills keys/labels, drops only invalid bits (e.g. an unknown
 * computation kind), and accepts several JSON envelope shapes.
 */
export function parseSections(raw: string): GeneratedSection[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonBlock(raw));
  } catch {
    return [];
  }
  const p = parsed as { sections?: unknown; planner?: { sections?: unknown } };
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray(p?.sections)
      ? p.sections
      : Array.isArray(p?.planner?.sections)
        ? p.planner!.sections
        : null;
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 20) // cap to bound downstream DB writes on a runaway response
    .map(normalizeSection)
    .filter((s): s is GeneratedSection => s !== null);
}

/** Generate bespoke section specs for a person from their life facets. */
export async function generateSectionsFromFacets(
  facets: ILifeFacet[],
  provider: AIProvider,
  apiKey: string
): Promise<GeneratedSection[]> {
  const userMessage = `This person's life facets:\n${facetSummary(facets)}\n\nDesign their planner sections.`;
  const raw = await callAI(provider, apiKey, SECTION_GEN_SYSTEM_PROMPT, userMessage);
  const sections = parseSections(raw);
  if (sections.length === 0) {
    console.error(
      "[generateSectionsFromFacets] 0 sections parsed. Raw (first 800 chars):",
      raw.slice(0, 800)
    );
  }
  return sections;
}
