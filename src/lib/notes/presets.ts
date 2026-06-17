import type { PresetKey } from "@/lib/notes/types";

/** Minimal partial-block shape; BlockNote fills defaults for the rest. */
export interface PresetBlock {
  type: string;
  content?: string;
}

const para = (text = ""): PresetBlock => ({ type: "paragraph", content: text });
const h = (text: string): PresetBlock => ({ type: "heading", content: text });
const check = (text = ""): PresetBlock => ({ type: "checkListItem", content: text });

const builders: Record<PresetKey, () => PresetBlock[]> = {
  blank: () => [para()],
  todo: () => [h("To-dos"), check("First task"), check("Second task"), check("")],
  meeting: () => [
    h("Meeting notes"), para("Date: "), para("Attendees: "),
    h("Agenda"), para(""), h("Notes"), para(""), h("Action items"), check(""),
  ],
  journal: () => [
    h("Journal"), h("Highlights"), para(""), h("Gratitude"), para(""), h("Notes"), para(""),
  ],
  project: () => [
    h("Project"), h("Goals"), para(""), h("Milestones"), check(""), h("Notes"), para(""),
  ],
};

export function buildPreset(key: PresetKey): PresetBlock[] {
  return builders[key]();
}

export const PRESETS: { key: PresetKey; label: string; description: string }[] = [
  { key: "blank", label: "Blank page", description: "Start from scratch" },
  { key: "todo", label: "To-do list", description: "A checklist to knock out tasks" },
  { key: "meeting", label: "Meeting notes", description: "Agenda, notes, action items" },
  { key: "journal", label: "Daily journal", description: "Highlights, gratitude, notes" },
  { key: "project", label: "Project tracker", description: "Goals, milestones, notes" },
];
