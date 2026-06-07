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
