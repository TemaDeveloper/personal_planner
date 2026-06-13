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
    `You cannot change the section's built-in features (for example: jobs on Work, subjects on Study, the core trackers) — only this list of extra custom fields.`,
    `Current extra fields: ${JSON.stringify(current)}.`,
    `User request: "${userPrompt}".`,
    `If the request is about adding/removing/editing a BUILT-IN feature rather than an extra custom field, do NOT invent a field. Instead return JSON: { "unsupported": true, "message": "<one short sentence telling the user where to do it>" }. For Work jobs the message must tell them to use the "+ Add job" button on the Work page; for other built-ins, point them to Settings.`,
    `Otherwise return the COMPLETE updated list as JSON: { "extraFields": FieldDef[] }. Keep existing fields unless the request removes/renames them. ${FIELD_RULES}`,
  ].join("\n");
}

export function parseExtraFieldsResponse(raw: string): z.infer<typeof extraFieldsUpdateSchema> {
  return extraFieldsUpdateSchema.parse(JSON.parse(extractJSON(raw)));
}

export async function generateBuiltinFieldUpdate(sectionLabel: string, current: FieldDef[], userPrompt: string) {
  const raw = await rawCompletion(buildBuiltinFieldPrompt(sectionLabel, current, userPrompt));
  return parseExtraFieldsResponse(raw);
}

export interface RegistryEntry {
  key: string;
  label: string;
  sectionKey: string;
  fieldKey: string;
  aggregation: "sum" | "avg" | "latest" | "count";
  period: "week" | "month";
}

export function buildDashboardMetricPrompt(registry: RegistryEntry[], current: unknown[], userPrompt: string): string {
  return [
    `You manage the metric cards on a personal-planner dashboard.`,
    `Available metrics: ${JSON.stringify(registry)}.`,
    `Each available metric has: key, label, sectionKey, fieldKey, aggregation, period.`,
    `Current metric cards: ${JSON.stringify(current)}.`,
    `User request: "${userPrompt}".`,
    `Return the COMPLETE updated list as JSON: { "metrics": [{ "label", "sectionKey", "fieldKey", "sourceKind": "builtin", "aggregation", "period" }] }.`,
    `IMPORTANT: For each metric you add, copy the sectionKey, fieldKey, aggregation, and period EXACTLY as they appear in the available metrics list above. Set sourceKind to "builtin" for all registry metrics. Only use sectionKey+fieldKey combinations that exist in the available metrics. Return ONLY JSON.`,
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
    `Return the COMPLETE updated single-section config as JSON with keys: name, icon, description, viewType (weekly-cards|table|grid|board), fields (FieldDef[]), layoutHtml. Keep existing fields/layout unless the request changes them.`,
    `BOARD VIEWTYPE: If the user asks for a Kanban board, columns, "to do / in progress / done", task board, or workflow with swimlane columns — set viewType to "board", set layoutHtml to "" (empty string, the board UI renders automatically), and ensure fields include: (1) select field key "status" with options matching the requested columns (default ["To Do","In Progress","Done"]), (2) select field key "priority" with options ["Low","Medium","High"], (3) text field key "title" for the task name.`,
    FIELD_RULES,
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
