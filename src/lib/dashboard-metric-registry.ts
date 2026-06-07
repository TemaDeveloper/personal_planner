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
