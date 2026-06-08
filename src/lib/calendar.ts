import { startOfWeek, startOfDay, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type CalendarCategory = {
  key: string;
  label: string;
  color: string; // hex from CALENDAR_PALETTE
};

/** Fixed, theme-coherent palette (chart tokens + a few extras), stored as hex. */
export const CALENDAR_PALETTE = [
  "#C0613C", // clay
  "#3F6B8C", // ocean
  "#7A5C7E", // plum
  "#C99A3B", // amber
  "#5E8C6A", // sage
  "#C0524A", // red
  "#3F8C86", // teal
  "#5C5552", // graphite
] as const;

export const DEFAULT_CATEGORIES: CalendarCategory[] = [
  { key: "personal", label: "Personal", color: "#C0613C" },
  { key: "work", label: "Work", color: "#3F6B8C" },
  { key: "health", label: "Health", color: "#5E8C6A" },
];

const NEUTRAL_FALLBACK = "#5C5552";

/** Color for an event's category, falling back to the first category or neutral grey. */
export function categoryColor(categories: CalendarCategory[], key: string | undefined): string {
  if (!categories.length) return NEUTRAL_FALLBACK;
  const found = categories.find((c) => c.key === key);
  return (found ?? categories[0]).color;
}

/** Inclusive [start, end] range of the month grid (whole Mon-started weeks). */
export function monthGridRange(d: Date): { start: Date; end: Date } {
  const start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
  const end = startOfDay(endOfWeek(endOfMonth(d), { weekStartsOn: 1 }));
  return { start, end };
}
