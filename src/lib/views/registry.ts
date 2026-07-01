/**
 * The view vocabulary. The corpus needs ~12 archetypes; the app ships 5 real
 * renderers today. Each archetype declares which existing renderer it maps to
 * until a dedicated component is promoted (Seed → Generate → Learn-back: hot
 * layouts graduate into their own components later). Unknown view types fall
 * back gracefully instead of breaking the page.
 */

export type Renderer = "weekly-cards" | "table" | "grid" | "board" | "calendar";

export type ViewType =
  | "weekly-cards"
  | "table"
  | "grid"
  | "board"
  | "calendar"
  | "goal-progress"
  | "streak"
  | "daily-log"
  | "schedule"
  | "trend"
  | "pipeline"
  | "budget";

export interface ViewMeta {
  key: ViewType;
  label: string;
  description: string;
  renderer: Renderer;
  /** whether this view surfaces per-row computed fields */
  supportsComputed: boolean;
}

export const VIEW_REGISTRY: Record<ViewType, ViewMeta> = {
  "weekly-cards": { key: "weekly-cards", label: "Weekly cards", description: "One card per day of the week", renderer: "weekly-cards", supportsComputed: false },
  table: { key: "table", label: "Table", description: "Rows of entries with totals", renderer: "table", supportsComputed: true },
  grid: { key: "grid", label: "Grid", description: "Attendance/habit dot grid", renderer: "grid", supportsComputed: false },
  board: { key: "board", label: "Board", description: "Kanban columns", renderer: "board", supportsComputed: false },
  calendar: { key: "calendar", label: "Calendar", description: "Time-based events", renderer: "calendar", supportsComputed: false },
  "goal-progress": { key: "goal-progress", label: "Goal progress", description: "Progress toward a target", renderer: "table", supportsComputed: true },
  streak: { key: "streak", label: "Streak", description: "Consecutive-day tracking", renderer: "grid", supportsComputed: false },
  "daily-log": { key: "daily-log", label: "Daily log", description: "Dated log of entries", renderer: "table", supportsComputed: true },
  schedule: { key: "schedule", label: "Schedule", description: "Time-slotted plan", renderer: "table", supportsComputed: true },
  trend: { key: "trend", label: "Trend", description: "Values over time", renderer: "table", supportsComputed: true },
  pipeline: { key: "pipeline", label: "Pipeline", description: "Stages a record moves through", renderer: "board", supportsComputed: false },
  budget: { key: "budget", label: "Budget", description: "Money in/out with a net", renderer: "table", supportsComputed: true },
};

export const VIEW_TYPES = Object.keys(VIEW_REGISTRY) as ViewType[];

/** Effective renderer for a (possibly novel) view type; defaults to weekly-cards. */
export function resolveRenderer(viewType: string | undefined | null): Renderer {
  if (viewType && viewType in VIEW_REGISTRY) {
    return VIEW_REGISTRY[viewType as ViewType].renderer;
  }
  return "weekly-cards";
}
