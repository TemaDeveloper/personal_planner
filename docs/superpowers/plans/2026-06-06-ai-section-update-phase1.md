# AI Section Update — Phase 1 (Data + AI + Endpoint) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server foundation for "update any section with AI Studio" — the three data models, the AI prompt-builders/parsers, the pure update-resolver logic, the zod schemas, and the unified `POST /api/ai/update` endpoint (+ custom-section `PATCH`). No UI in this phase.

**Architecture:** A unified endpoint resolves a `sectionKey` into one of three kinds (`builtin` | `custom` | `dashboard`) and applies an AI-produced change: built-ins get an AI-managed `extraFields` list (`SectionCustomization`), custom sections get their `SectionTemplate` rewritten, the dashboard gets a `DashboardMetric[]` list chosen from a registry. AI functions are split into pure `build…Prompt` / `parse…` halves (unit-testable) around the existing Mistral call, and the apply/merge/validate logic lives in a pure `section-update.ts` module.

**Tech Stack:** Next.js 16 App Router route handlers, Mongoose, Zod, the existing `src/lib/ai.ts` Mistral plumbing (`extractJSON`, `callMistral`), vitest.

**Branch:** `feat/ai-section-update` (already checked out).
**Spec:** `docs/superpowers/specs/2026-06-06-ai-section-update-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/lib/section-update.ts` | Pure logic: resolve section kind, validate/merge extra fields & metrics | Create |
| `src/lib/__tests__/section-update.test.ts` | Tests for the pure logic | Create |
| `src/lib/ai-section-update.ts` | AI prompt builders + response parsers (pure) + 3 generator fns (network) | Create |
| `src/lib/__tests__/ai-section-update.test.ts` | Tests for prompt builders + parsers | Create |
| `src/lib/models/section-customization.ts` | Per-user extra fields on a built-in section | Create |
| `src/lib/models/custom-field-value.ts` | Day-level values for custom fields | Create |
| `src/lib/models/dashboard-metric.ts` | Dashboard metric cards | Create |
| `src/lib/dashboard-metric-registry.ts` | Catalog of selectable built-in metrics | Create |
| `src/app/api/ai/update/route.ts` | Unified update endpoint | Create |
| `src/app/api/sections/templates/[slug]/route.ts` | Add `PATCH` to apply revised custom-section config | Modify |

---

## Task 1: Pure section-update logic

**Files:**
- Create: `src/lib/section-update.ts`
- Create: `src/lib/__tests__/section-update.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/section-update.test.ts
import { describe, it, expect } from "vitest";
import {
  resolveSectionKind,
  validateExtraFields,
  type FieldDef,
} from "@/lib/section-update";

describe("resolveSectionKind", () => {
  it("classifies the dashboard", () => {
    expect(resolveSectionKind("dashboard")).toEqual({ kind: "dashboard" });
  });
  it("classifies a built-in section", () => {
    expect(resolveSectionKind("work")).toEqual({ kind: "builtin", sectionKey: "work" });
    expect(resolveSectionKind("gym")).toEqual({ kind: "builtin", sectionKey: "gym" });
  });
  it("classifies a custom section by its custom: prefix", () => {
    expect(resolveSectionKind("custom:water-intake")).toEqual({ kind: "custom", slug: "water-intake" });
  });
  it("throws on an unknown section key", () => {
    expect(() => resolveSectionKind("nope")).toThrow(/unknown section/i);
  });
});

describe("validateExtraFields", () => {
  const ok: FieldDef[] = [
    { key: "tips", label: "Tips", type: "number" },
    { key: "mood", label: "Mood", type: "select", options: ["good", "bad"] },
  ];
  it("accepts a clean, unique set", () => {
    expect(validateExtraFields(ok)).toEqual(ok);
  });
  it("rejects duplicate keys", () => {
    expect(() => validateExtraFields([...ok, { key: "tips", label: "Tips 2", type: "text" }])).toThrow(/duplicate/i);
  });
  it("rejects empty keys", () => {
    expect(() => validateExtraFields([{ key: "", label: "X", type: "text" }])).toThrow(/key/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/__tests__/section-update.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/section-update.ts
import { SECTIONS, type SectionId } from "@/lib/constants";

export type FieldType = "boolean" | "number" | "text" | "select" | "date";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  formula?: string;
}

export type SectionKind =
  | { kind: "dashboard" }
  | { kind: "builtin"; sectionKey: SectionId }
  | { kind: "custom"; slug: string };

export function resolveSectionKind(sectionKey: string): SectionKind {
  if (sectionKey === "dashboard") return { kind: "dashboard" };
  if (sectionKey.startsWith("custom:")) {
    return { kind: "custom", slug: sectionKey.slice("custom:".length) };
  }
  if ((SECTIONS as readonly string[]).includes(sectionKey)) {
    return { kind: "builtin", sectionKey: sectionKey as SectionId };
  }
  throw new Error(`Unknown section: ${sectionKey}`);
}

/** The AI returns the full desired list of extra fields; validate before persisting. */
export function validateExtraFields(fields: FieldDef[]): FieldDef[] {
  const seen = new Set<string>();
  for (const f of fields) {
    if (!f.key || !/^[a-z0-9_]+$/i.test(f.key)) {
      throw new Error(`Invalid field key: "${f.key}"`);
    }
    if (seen.has(f.key)) throw new Error(`Duplicate field key: "${f.key}"`);
    seen.add(f.key);
  }
  return fields;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/__tests__/section-update.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/section-update.ts src/lib/__tests__/section-update.test.ts
git commit -m "feat: pure section-update resolver + extra-field validation"
```

---

## Task 2: AI output zod schemas + request schema

**Files:**
- Modify: `src/lib/validations.ts` (append)

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/ai-update-validations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  aiUpdateRequestSchema,
  extraFieldsUpdateSchema,
  dashboardMetricsUpdateSchema,
} from "@/lib/validations";

describe("ai update validations", () => {
  it("accepts a valid update request", () => {
    expect(aiUpdateRequestSchema.parse({ sectionKey: "gym", prompt: "add a temperature field" }))
      .toEqual({ sectionKey: "gym", prompt: "add a temperature field" });
  });
  it("rejects a too-short prompt", () => {
    expect(aiUpdateRequestSchema.safeParse({ sectionKey: "gym", prompt: "x" }).success).toBe(false);
  });
  it("parses an extra-fields update", () => {
    const r = extraFieldsUpdateSchema.parse({ extraFields: [{ key: "temp", label: "Temp", type: "number" }] });
    expect(r.extraFields[0].key).toBe("temp");
  });
  it("parses a dashboard metrics update", () => {
    const r = dashboardMetricsUpdateSchema.parse({
      metrics: [{ label: "Avg sleep", sectionKey: "health", fieldKey: "avgSleep", sourceKind: "builtin", aggregation: "avg", period: "week" }],
    });
    expect(r.metrics[0].label).toBe("Avg sleep");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/__tests__/ai-update-validations.test.ts`
Expected: FAIL — schemas not exported.

- [ ] **Step 3: Append to `src/lib/validations.ts`**

```ts
// -- AI Section Update --
export const fieldDefSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/i, "key must be alphanumeric/underscore"),
  label: z.string().min(1).max(60),
  type: z.enum(["boolean", "number", "text", "select", "date"]),
  options: z.array(z.string().max(40)).max(20).optional(),
  required: z.boolean().optional(),
  formula: z.string().max(200).optional(),
});

export const aiUpdateRequestSchema = z.object({
  sectionKey: z.string().min(1).max(80),
  prompt: z.string().min(3, "Describe the change").max(2000),
});

export const extraFieldsUpdateSchema = z.object({
  extraFields: z.array(fieldDefSchema).max(20),
});

export const dashboardMetricSchema = z.object({
  label: z.string().min(1).max(40),
  sectionKey: z.string().min(1).max(80),
  fieldKey: z.string().min(1).max(60),
  sourceKind: z.enum(["builtin", "custom-field"]),
  aggregation: z.enum(["sum", "avg", "latest", "count"]),
  period: z.enum(["week", "month"]).default("week"),
});

export const dashboardMetricsUpdateSchema = z.object({
  metrics: z.array(dashboardMetricSchema).max(12),
});

export const singleSectionUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(40).default("Star"),
  description: z.string().max(200).default(""),
  viewType: z.enum(["weekly-cards", "table", "grid"]).default("weekly-cards"),
  fields: z.array(fieldDefSchema).max(30),
  layoutHtml: z.string().min(1),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/__tests__/ai-update-validations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts src/lib/__tests__/ai-update-validations.test.ts
git commit -m "feat: zod schemas for AI section-update outputs + request"
```

---

## Task 3: AI prompt builders + parsers

**Files:**
- Create: `src/lib/ai-section-update.ts`
- Create: `src/lib/__tests__/ai-section-update.test.ts`

Each AI function is split: a pure `build…Prompt` (testable) and a pure `parse…` (testable) around a network call to the existing default-AI Mistral plumbing.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/ai-section-update.test.ts
import { describe, it, expect } from "vitest";
import {
  buildBuiltinFieldPrompt,
  parseExtraFieldsResponse,
  buildDashboardMetricPrompt,
  parseDashboardMetricsResponse,
} from "@/lib/ai-section-update";

describe("builtin field update prompt", () => {
  it("includes the section label, current fields, and the user request", () => {
    const p = buildBuiltinFieldPrompt("Gym", [{ key: "tips", label: "Tips", type: "number" }], "add a temperature field");
    expect(p).toContain("Gym");
    expect(p).toContain("tips");
    expect(p).toContain("add a temperature field");
  });
});

describe("parseExtraFieldsResponse", () => {
  it("extracts and validates fields from a fenced JSON reply", () => {
    const raw = "```json\n{\"extraFields\":[{\"key\":\"temp\",\"label\":\"Temp\",\"type\":\"number\"}]}\n```";
    expect(parseExtraFieldsResponse(raw).extraFields[0].key).toBe("temp");
  });
  it("throws on invalid JSON content", () => {
    expect(() => parseExtraFieldsResponse("not json")).toThrow();
  });
});

describe("dashboard metric prompt + parse", () => {
  it("lists the available registry metrics", () => {
    const p = buildDashboardMetricPrompt(
      [{ key: "health.avgSleep", label: "Average sleep", sectionKey: "health" }],
      [],
      "add my average sleep"
    );
    expect(p).toContain("health.avgSleep");
    expect(p).toContain("average sleep");
  });
  it("parses a metrics reply", () => {
    const raw = '{"metrics":[{"label":"Avg sleep","sectionKey":"health","fieldKey":"avgSleep","sourceKind":"builtin","aggregation":"avg","period":"week"}]}';
    expect(parseDashboardMetricsResponse(raw).metrics[0].fieldKey).toBe("avgSleep");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/__tests__/ai-section-update.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/ai-section-update.ts
import { extractJSON, rawCompletion } from "@/lib/ai";
import {
  extraFieldsUpdateSchema,
  dashboardMetricsUpdateSchema,
  singleSectionUpdateSchema,
} from "@/lib/validations";
import type { FieldDef } from "@/lib/section-update";
import { z } from "zod";

const FIELD_RULES = `Each field: { "key": snake_case unique id, "label": human label, "type": one of boolean|number|text|select|date, "options": string[] only for select }. Return ONLY JSON.`;

export function buildBuiltinFieldPrompt(sectionLabel: string, current: FieldDef[], userPrompt: string): string {
  return [
    `You manage EXTRA custom fields added to the "${sectionLabel}" section of a personal planner.`,
    `You cannot change the section's built-in features — only this list of extra fields.`,
    `Current extra fields: ${JSON.stringify(current)}.`,
    `User request: "${userPrompt}".`,
    `Return the COMPLETE updated list as JSON: { "extraFields": FieldDef[] }. Keep existing fields unless the request removes/renames them. ${FIELD_RULES}`,
  ].join("\n");
}

export function parseExtraFieldsResponse(raw: string): z.infer<typeof extraFieldsUpdateSchema> {
  return extraFieldsUpdateSchema.parse(JSON.parse(extractJSON(raw)));
}

export async function generateBuiltinFieldUpdate(sectionLabel: string, current: FieldDef[], userPrompt: string) {
  const raw = await rawCompletion(buildBuiltinFieldPrompt(sectionLabel, current, userPrompt));
  return parseExtraFieldsResponse(raw);
}

export interface RegistryEntry { key: string; label: string; sectionKey: string }

export function buildDashboardMetricPrompt(registry: RegistryEntry[], current: unknown[], userPrompt: string): string {
  return [
    `You manage the metric cards on a personal-planner dashboard.`,
    `Available metrics (choose by key): ${JSON.stringify(registry)}.`,
    `Current metric cards: ${JSON.stringify(current)}.`,
    `User request: "${userPrompt}".`,
    `Return the COMPLETE updated list as JSON: { "metrics": [{ "label", "sectionKey", "fieldKey", "sourceKind": "builtin"|"custom-field", "aggregation": "sum"|"avg"|"latest"|"count", "period": "week"|"month" }] }. Only use fieldKeys that exist in the available metrics. Return ONLY JSON.`,
  ].join("\n");
}

export function parseDashboardMetricsResponse(raw: string): z.infer<typeof dashboardMetricsUpdateSchema> {
  return dashboardMetricsUpdateSchema.parse(JSON.parse(extractJSON(raw)));
}

export async function generateDashboardMetricUpdate(registry: RegistryEntry[], current: unknown[], userPrompt: string) {
  const raw = await rawCompletion(buildDashboardMetricPrompt(registry, current, userPrompt));
  return parseDashboardMetricsResponse(raw);
}

export function buildCustomSectionPrompt(currentConfig: unknown, userPrompt: string): string {
  return [
    `You update a single custom section of a personal planner (it is pure data: fields + an HTML layout template).`,
    `Current section config: ${JSON.stringify(currentConfig)}.`,
    `Change requested: "${userPrompt}".`,
    `Return the COMPLETE updated single-section config as JSON with keys: name, icon, description, viewType (weekly-cards|table|grid), fields (FieldDef[]), layoutHtml. Keep existing fields/layout unless the request changes them. ${FIELD_RULES}`,
  ].join("\n");
}

export function parseCustomSectionResponse(raw: string): z.infer<typeof singleSectionUpdateSchema> {
  return singleSectionUpdateSchema.parse(JSON.parse(extractJSON(raw)));
}

/** Custom-section update: free-form completion parsed against the single-section schema (NOT the full PlannerConfig). */
export async function generateCustomSectionUpdate(currentConfig: unknown, userPrompt: string) {
  const raw = await rawCompletion(buildCustomSectionPrompt(currentConfig, userPrompt));
  return parseCustomSectionResponse(raw);
}
```

- [ ] **Step 3b: Add `rawCompletion` to `src/lib/ai.ts`**

After `generateWithDefaultAI` (around line 433), add:

```ts
/** Free-form single-shot completion using the default (Mistral) provider — returns raw text. */
export async function rawCompletion(prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");
  return callAI("mistral", apiKey, "You are a precise JSON-only assistant for a personal planner. Reply with JSON only.", prompt);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/__tests__/ai-section-update.test.ts`
Expected: PASS (5 tests). (These exercise the pure builders/parsers only — no network.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai-section-update.ts src/lib/__tests__/ai-section-update.test.ts src/lib/ai.ts
git commit -m "feat: AI prompt builders + parsers for section update"
```

---

## Task 4: Mongoose models

**Files:**
- Create: `src/lib/models/section-customization.ts`
- Create: `src/lib/models/custom-field-value.ts`
- Create: `src/lib/models/dashboard-metric.ts`

- [ ] **Step 1: Implement `section-customization.ts`**

```ts
import mongoose, { Schema, type Document } from "mongoose";

export interface ISectionCustomization extends Document {
  userId: mongoose.Types.ObjectId;
  sectionKey: string;
  extraFields: {
    key: string; label: string;
    type: "boolean" | "number" | "text" | "select" | "date";
    options?: string[]; required?: boolean; formula?: string;
  }[];
  sourcePrompt?: string;
}

const FieldSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["boolean", "number", "text", "select", "date"], required: true },
    options: { type: [String], default: undefined },
    required: { type: Boolean, default: false },
    formula: { type: String },
  },
  { _id: false }
);

const SectionCustomizationSchema = new Schema<ISectionCustomization>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sectionKey: { type: String, required: true },
    extraFields: { type: [FieldSchema], default: [] },
    sourcePrompt: { type: String },
  },
  { timestamps: true, collection: "section_customizations" }
);
SectionCustomizationSchema.index({ userId: 1, sectionKey: 1 }, { unique: true });

if (mongoose.models.SectionCustomization) mongoose.deleteModel("SectionCustomization");
export default mongoose.model<ISectionCustomization>("SectionCustomization", SectionCustomizationSchema);
```

- [ ] **Step 2: Implement `custom-field-value.ts`**

```ts
import mongoose, { Schema, type Document } from "mongoose";

export interface ICustomFieldValue extends Document {
  userId: mongoose.Types.ObjectId;
  sectionKey: string;
  dateKey: string; // yyyy-MM-dd (UTC) — see src/lib/gym-date.ts
  fieldKey: string;
  value: unknown;
}

const CustomFieldValueSchema = new Schema<ICustomFieldValue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sectionKey: { type: String, required: true },
    dateKey: { type: String, required: true },
    fieldKey: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "custom_field_values" }
);
CustomFieldValueSchema.index({ userId: 1, sectionKey: 1, dateKey: 1, fieldKey: 1 }, { unique: true });

if (mongoose.models.CustomFieldValue) mongoose.deleteModel("CustomFieldValue");
export default mongoose.model<ICustomFieldValue>("CustomFieldValue", CustomFieldValueSchema);
```

- [ ] **Step 3: Implement `dashboard-metric.ts`**

```ts
import mongoose, { Schema, type Document } from "mongoose";

export interface IDashboardMetric extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  sourceKind: "builtin" | "custom-field";
  sectionKey: string;
  fieldKey: string;
  aggregation: "sum" | "avg" | "latest" | "count";
  period: "week" | "month";
  order: number;
}

const DashboardMetricSchema = new Schema<IDashboardMetric>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, required: true },
    sourceKind: { type: String, enum: ["builtin", "custom-field"], required: true },
    sectionKey: { type: String, required: true },
    fieldKey: { type: String, required: true },
    aggregation: { type: String, enum: ["sum", "avg", "latest", "count"], required: true },
    period: { type: String, enum: ["week", "month"], default: "week" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "dashboard_metrics" }
);
DashboardMetricSchema.index({ userId: 1, order: 1 });

if (mongoose.models.DashboardMetric) mongoose.deleteModel("DashboardMetric");
export default mongoose.model<IDashboardMetric>("DashboardMetric", DashboardMetricSchema);
```

- [ ] **Step 4: Verify they compile**

Run: `pnpm build`
Expected: Compiled successfully (the new models type-check; they are imported in Task 5/6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/models/section-customization.ts src/lib/models/custom-field-value.ts src/lib/models/dashboard-metric.ts
git commit -m "feat: models for section customization, custom field values, dashboard metrics"
```

---

## Task 5: Dashboard metric registry

**Files:**
- Create: `src/lib/dashboard-metric-registry.ts`
- Add tests in `src/lib/__tests__/section-update.test.ts` (append)

The registry is the static catalog of selectable built-in metrics (the dashboard already computes these). Phase 4 wires real values; Phase 1 just needs the catalog so the AI can choose from it.

- [ ] **Step 1: Append failing test to `src/lib/__tests__/section-update.test.ts`**

```ts
import { BUILTIN_METRIC_REGISTRY, registryForSections } from "@/lib/dashboard-metric-registry";

describe("dashboard metric registry", () => {
  it("has known built-in metrics with stable keys", () => {
    const keys = BUILTIN_METRIC_REGISTRY.map((m) => m.key);
    expect(keys).toContain("work.weekEarnings");
    expect(keys).toContain("gym.daysThisWeek");
  });
  it("filters to enabled sections only", () => {
    const r = registryForSections(["gym"]);
    expect(r.every((m) => m.sectionKey === "gym")).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/__tests__/section-update.test.ts`
Expected: FAIL — registry module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/dashboard-metric-registry.ts
import type { SectionId } from "@/lib/constants";

export interface RegistryMetric {
  key: string;        // stable id, e.g. "work.weekEarnings"
  label: string;
  sectionKey: SectionId;
  fieldKey: string;   // the computed field this maps to
  aggregation: "sum" | "avg" | "latest" | "count";
  period: "week" | "month";
}

export const BUILTIN_METRIC_REGISTRY: RegistryMetric[] = [
  { key: "work.weekEarnings", label: "Earnings this week", sectionKey: "work", fieldKey: "weekEarnings", aggregation: "sum", period: "week" },
  { key: "work.monthEarnings", label: "Earnings this month", sectionKey: "work", fieldKey: "monthEarnings", aggregation: "sum", period: "month" },
  { key: "gym.daysThisWeek", label: "Gym days this week", sectionKey: "gym", fieldKey: "daysThisWeek", aggregation: "count", period: "week" },
  { key: "study.minutesThisWeek", label: "Study minutes this week", sectionKey: "study", fieldKey: "minutesThisWeek", aggregation: "sum", period: "week" },
  { key: "health.avgSleep", label: "Average sleep", sectionKey: "health", fieldKey: "avgSleep", aggregation: "avg", period: "week" },
  { key: "finances.netThisMonth", label: "Net this month", sectionKey: "finances", fieldKey: "netThisMonth", aggregation: "sum", period: "month" },
];

export function registryForSections(enabled: string[]): RegistryMetric[] {
  return BUILTIN_METRIC_REGISTRY.filter((m) => enabled.includes(m.sectionKey));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/__tests__/section-update.test.ts`
Expected: PASS (all section-update + registry tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-metric-registry.ts src/lib/__tests__/section-update.test.ts
git commit -m "feat: dashboard metric registry (built-in catalog)"
```

---

## Task 6: Unified `POST /api/ai/update` endpoint + custom-section PATCH

**Files:**
- Create: `src/app/api/ai/update/route.ts`
- Modify: `src/app/api/sections/templates/[slug]/route.ts` (add `PATCH`)

This wires the pieces together. It is verified by the production build (route type-checks against the models/AI/validation) and exercised live in Phase 3; no unit test (route handlers need full auth+DB mocking, which the codebase does not do).

- [ ] **Step 1: Create `src/app/api/ai/update/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { aiUpdateRequestSchema } from "@/lib/validations";
import { resolveSectionKind, validateExtraFields } from "@/lib/section-update";
import {
  generateBuiltinFieldUpdate,
  generateDashboardMetricUpdate,
  generateCustomSectionUpdate,
  type RegistryEntry,
} from "@/lib/ai-section-update";
import { registryForSections } from "@/lib/dashboard-metric-registry";
import { SECTION_META, type SectionId } from "@/lib/constants";
import SectionCustomization from "@/lib/models/section-customization";
import DashboardMetric from "@/lib/models/dashboard-metric";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = aiUpdateRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { sectionKey, prompt } = parsed.data;

  let resolved;
  try {
    resolved = resolveSectionKind(sectionKey);
  } catch {
    return NextResponse.json({ error: `Unknown section: ${sectionKey}` }, { status: 400 });
  }

  await connectDB();

  try {
    if (resolved.kind === "builtin") {
      const existing = await SectionCustomization.findOne({ userId, sectionKey: resolved.sectionKey }).lean();
      const label = SECTION_META[resolved.sectionKey as SectionId]?.label ?? resolved.sectionKey;
      const update = await generateBuiltinFieldUpdate(label, existing?.extraFields ?? [], prompt);
      const fields = validateExtraFields(update.extraFields);
      const saved = await SectionCustomization.findOneAndUpdate(
        { userId, sectionKey: resolved.sectionKey },
        { $set: { extraFields: fields, sourcePrompt: prompt } },
        { upsert: true, new: true }
      ).lean();
      return NextResponse.json({ kind: "builtin", customization: saved });
    }

    if (resolved.kind === "dashboard") {
      const user = await User.findById(userId).select("enabledSections").lean();
      const enabled = (user?.enabledSections as string[] | undefined) ?? [];
      const registry: RegistryEntry[] = registryForSections(enabled).map((m) => ({ key: m.key, label: m.label, sectionKey: m.sectionKey }));
      const current = await DashboardMetric.find({ userId }).sort({ order: 1 }).lean();
      const update = await generateDashboardMetricUpdate(registry, current, prompt);
      await DashboardMetric.deleteMany({ userId });
      const docs = update.metrics.map((m, i) => ({ ...m, userId, order: i }));
      const saved = docs.length ? await DashboardMetric.insertMany(docs) : [];
      return NextResponse.json({ kind: "dashboard", metrics: saved });
    }

    // custom section
    const template = await SectionTemplate.findOne({ slug: resolved.slug, createdBy: userId });
    if (!template) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    const cs = await generateCustomSectionUpdate(
      { name: template.name, icon: template.icon, description: template.description, viewType: template.viewType, fields: template.fields, layoutHtml: template.layoutHtml },
      prompt
    );
    template.set({ name: cs.name, icon: cs.icon, description: cs.description, viewType: cs.viewType, fields: cs.fields, layoutHtml: cs.layoutHtml, sourcePrompt: prompt });
    await template.save();
    return NextResponse.json({ kind: "custom", template });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI update failed";
    console.error("[ai/update] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add `PATCH` to `src/app/api/sections/templates/[slug]/route.ts`**

Append this export (keeps the existing GET/DELETE):

```ts
import { fieldDefSchema } from "@/lib/validations";
import { z } from "zod";

const patchTemplateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  viewType: z.enum(["weekly-cards", "table", "grid"]).optional(),
  fields: z.array(fieldDefSchema).optional(),
  layoutHtml: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchTemplateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const { slug } = await params;
  const template = await SectionTemplate.findOneAndUpdate(
    { slug, createdBy: userId },
    { $set: parsed.data },
    { new: true }
  ).lean();

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template });
}
```

(If `NextRequest` is not already imported in that file, the existing import already includes it — verify the top of the file imports `NextRequest, NextResponse`, `auth`, `connectDB`, `resolveUserId`, `SectionTemplate`; add only what's missing.)

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Compiled successfully — all routes type-check.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass (existing + new section-update/ai-update/registry tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/ai/update/route.ts" "src/app/api/sections/templates/[slug]/route.ts"
git commit -m "feat: unified /api/ai/update endpoint + custom-section PATCH"
```

---

## Task 7: Phase 1 verification gate

**Files:** none

- [ ] **Step 1:** `pnpm test` — all green.
- [ ] **Step 2:** `pnpm lint` — no new errors (pre-existing `promo-video` error is acceptable).
- [ ] **Step 3:** `pnpm build` — succeeds.
- [ ] **Step 4:** Confirm the endpoint surface exists: `grep -r "api/ai/update" src/app/api/ai/update/route.ts` returns the POST handler; `grep "export async function PATCH" src/app/api/sections/templates/[slug]/route.ts` is present.

---

## Notes for later phases (not this plan)

- **Phase 2:** `src/components/sections/custom-fields.tsx` (generic render block reading `SectionCustomization` + `CustomFieldValue` via a new `/api/sections/[sectionKey]/custom-fields` route) wired into each built-in page.
- **Phase 3:** AI Studio Create/Update toggle + section picker calling `/api/ai/update`.
- **Phase 4:** `/api/dashboard/metrics` resolving `DashboardMetric[]` against the registry into rendered values; editable metric cards on the dashboard.
- **Phase 5:** custom-section update UX polish (reuse layout regen).
- The AI generator functions (`generate*Update`) are exercised live in Phases 3–4; Phase 1 covers their pure prompt/parse halves only.
