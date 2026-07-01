import { SECTION_META, type SectionId, SECTIONS } from "@/lib/constants";
import type { IFieldDefinition } from "@/lib/models/section-template";

/**
 * The 13 former built-in sections, expressed as SEED SectionTemplates (data,
 * not code). This dissolves the privileged built-in tier into the unified
 * template system: they are ordinary templates that happen to ship by default.
 *
 * Note how the baked-in life assumptions become plain, optional fields:
 *  - "work" no longer hardcodes fuel-deducted pay — `fuel` is just a field that
 *    feeds a `net` computation; a cyclist simply leaves it empty.
 *  - "gym" is a target, not a fixed 5-day law.
 */
interface SeedSpec {
  viewType: string;
  fields: IFieldDefinition[];
}

const num = (key: string, label: string): IFieldDefinition => ({ key, label, type: "number" });
const text = (key: string, label: string): IFieldDefinition => ({ key, label, type: "text" });
const bool = (key: string, label: string): IFieldDefinition => ({ key, label, type: "boolean" });
const sel = (key: string, label: string, options: string[]): IFieldDefinition => ({
  key,
  label,
  type: "select",
  options,
});

// Field specs aligned to the real legacy data shapes so migration is faithful.
export const SEED_SPECS: Record<SectionId, SeedSpec> = {
  work: {
    viewType: "table",
    fields: [
      text("job", "Job"),
      num("hours", "Hours"),
      text("note", "Note"),
      num("gross", "Gross"),
      num("fuel", "Fuel cost"),
      {
        key: "net",
        label: "Net",
        type: "number",
        computation: { kind: "net", params: { add: ["gross"], subtract: ["fuel"] } },
      },
    ],
  },
  gym: {
    viewType: "streak",
    fields: [bool("attended", "Attended"), text("note", "Note")],
  },
  finances: {
    viewType: "budget",
    fields: [
      text("description", "Description"),
      num("amount", "Amount"),
      sel("type", "Type", ["income", "expense"]),
      sel("category", "Category", ["travel", "equipment", "meals", "office", "other"]),
      bool("reimbursed", "Reimbursed"),
    ],
  },
  habits: {
    viewType: "grid",
    fields: [text("habit", "Habit"), bool("done", "Done")],
  },
  study: {
    viewType: "table",
    fields: [
      text("subject", "Subject"),
      sel("item_type", "Type", ["lab", "assignment", "test", "quiz", "session"]),
      text("title", "Title"),
      num("grade", "Grade"),
      num("minutes", "Minutes"),
      bool("completed", "Completed"),
    ],
  },
  hobbies: {
    viewType: "table",
    fields: [
      text("hobby", "Hobby"),
      num("minutes", "Minutes"),
      text("note", "Note"),
      text("project", "Project"),
      sel("status", "Status", ["in-progress", "completed", "paused"]),
    ],
  },
  housework: {
    viewType: "table",
    fields: [
      text("chore", "Chore"),
      sel("frequency", "Frequency", ["daily", "weekly", "monthly"]),
      bool("done", "Done"),
    ],
  },
  health: {
    viewType: "daily-log",
    fields: [
      num("water", "Water (glasses)"),
      num("sleep_hours", "Sleep (hrs)"),
      num("weight", "Weight"),
      num("mood", "Mood (1-5)"),
    ],
  },
  goals: {
    viewType: "goal-progress",
    fields: [
      text("goal", "Goal"),
      text("description", "Description"),
      sel("category", "Category", ["personal", "career", "health", "financial"]),
      sel("status", "Status", ["active", "completed", "paused"]),
      { key: "target_date", label: "Target date", type: "date" },
      {
        key: "days_left",
        label: "Days left",
        type: "number",
        computation: { kind: "countdown", params: { target: "target_date" } },
      },
    ],
  },
  reading: {
    viewType: "table",
    fields: [
      text("title", "Title"),
      text("author", "Author"),
      num("current_page", "Current page"),
      num("total_pages", "Total pages"),
      {
        key: "progress",
        label: "Progress",
        type: "number",
        computation: {
          kind: "target_progress",
          params: { current: "current_page", target: "total_pages" },
        },
      },
      sel("status", "Status", ["want-to-read", "reading", "completed"]),
      num("rating", "Rating"),
      text("notes", "Notes"),
    ],
  },
  journal: {
    viewType: "daily-log",
    fields: [text("entry", "Entry"), num("mood", "Mood (1-5)")],
  },
  shopping: {
    viewType: "table",
    fields: [text("item", "Item"), num("qty", "Qty"), bool("bought", "Bought"), text("list", "List")],
  },
  mealprep: {
    viewType: "weekly-cards",
    fields: [
      text("meal", "Meal"),
      sel("day", "Day", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
      sel("type", "Type", ["breakfast", "lunch", "dinner", "snack"]),
      text("notes", "Notes"),
    ],
  },
};

export interface SeedTemplateDoc {
  name: string;
  slug: string;
  icon: string;
  description: string;
  fields: IFieldDefinition[];
  viewType: string;
  layoutHtml: string;
  isBuiltIn: boolean;
  createdBy: null;
  usageCount: number;
}

/** Build all 13 seed templates as plain documents (pure, testable). */
export function buildSeedTemplates(): SeedTemplateDoc[] {
  return SECTIONS.map((id) => {
    const meta = SECTION_META[id];
    const spec = SEED_SPECS[id];
    return {
      name: meta.label,
      slug: id,
      icon: meta.icon,
      description: meta.description,
      fields: spec.fields,
      viewType: spec.viewType,
      layoutHtml: "",
      isBuiltIn: true,
      createdBy: null,
      usageCount: 3, // shared/visible by default (>=3 threshold)
    };
  });
}
