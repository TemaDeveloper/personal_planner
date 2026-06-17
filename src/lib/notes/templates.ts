/** Minimal partial-block shape; BlockNote fills defaults for the rest. */
export interface PresetBlock {
  type: string;
  content?: string;
}

const para = (text = ""): PresetBlock => ({ type: "paragraph", content: text });
const h = (text: string): PresetBlock => ({ type: "heading", content: text });
const check = (text = ""): PresetBlock => ({ type: "checkListItem", content: text });
const bullet = (text = ""): PresetBlock => ({ type: "bulletListItem", content: text });

export type TemplateCategory =
  | "Basic" | "Students" | "Hobbies" | "Work & Productivity" | "Personal & Health";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Basic", "Students", "Hobbies", "Work & Productivity", "Personal & Health",
];

export interface NotesTemplate {
  key: string;
  category: TemplateCategory;
  label: string;
  description: string;
  icon: string;
  build: () => PresetBlock[];
}

export const TEMPLATES: NotesTemplate[] = [
  { key: "blank", category: "Basic", label: "Blank page", description: "Start from scratch", icon: "📄", build: () => [para()] },
  { key: "todo", category: "Basic", label: "To-do list", description: "A checklist to knock out tasks", icon: "✅", build: () => [h("To-dos"), check("First task"), check("Second task"), check("")] },
  { key: "meeting", category: "Basic", label: "Meeting notes", description: "Agenda, notes, action items", icon: "📝", build: () => [h("Meeting notes"), para("Date: "), para("Attendees: "), h("Agenda"), para(""), h("Notes"), para(""), h("Action items"), check("")] },
  { key: "journal", category: "Basic", label: "Daily journal", description: "Highlights, gratitude, notes", icon: "📔", build: () => [h("Journal"), h("Highlights"), para(""), h("Gratitude"), para(""), h("Notes"), para("")] },
  { key: "project", category: "Basic", label: "Project tracker", description: "Goals, milestones, notes", icon: "🎯", build: () => [h("Project"), h("Goals"), para(""), h("Milestones"), check(""), h("Notes"), para("")] },

  { key: "study-planner", category: "Students", label: "Study planner", description: "Plan study sessions by subject", icon: "📚", build: () => [h("Study planner"), para("Week of: "), h("Subjects"), check("Subject 1"), check("Subject 2"), h("Today's focus"), para(""), h("Notes"), para("")] },
  { key: "lecture-notes", category: "Students", label: "Course / lecture notes", description: "Structured notes for a class", icon: "🎓", build: () => [h("Lecture notes"), para("Course: "), para("Date: "), h("Key points"), bullet(""), h("Questions"), bullet(""), h("Summary"), para("")] },
  { key: "assignment-tracker", category: "Students", label: "Assignment & exam tracker", description: "Track due dates and grades", icon: "🗓️", build: () => [h("Assignments & exams"), h("Upcoming"), check("Assignment — due "), check("Exam — date "), h("Completed"), check("")] },
  { key: "reading-notes", category: "Students", label: "Reading notes", description: "Notes & takeaways from a text", icon: "📖", build: () => [h("Reading notes"), para("Title: "), para("Author: "), h("Key takeaways"), bullet(""), h("Quotes"), para(""), h("My thoughts"), para("")] },

  { key: "hobby-tracker", category: "Hobbies", label: "Hobby tracker", description: "Track time & progress on a hobby", icon: "🎨", build: () => [h("Hobby tracker"), para("Hobby: "), h("Sessions"), check("Session — "), h("Progress"), para(""), h("Goals"), check("")] },
  { key: "project-log", category: "Hobbies", label: "Project log", description: "Log progress on a personal project", icon: "🛠️", build: () => [h("Project log"), para("Project: "), h("Log"), para("Entry — "), h("Next steps"), check("")] },
  { key: "practice-journal", category: "Hobbies", label: "Practice journal", description: "Track practice and improvement", icon: "🎸", build: () => [h("Practice journal"), para("Date: "), h("What I practiced"), bullet(""), h("Wins"), para(""), h("To improve"), bullet("")] },
  { key: "collection", category: "Hobbies", label: "Collection list", description: "Catalogue a collection", icon: "🗂️", build: () => [h("Collection"), h("Items"), check("Item 1"), check("Item 2"), h("Wishlist"), check("")] },

  { key: "work-meeting", category: "Work & Productivity", label: "Meeting notes", description: "Agenda, decisions, action items", icon: "🧑‍💼", build: () => [h("Meeting"), para("Date: "), para("Attendees: "), h("Agenda"), bullet(""), h("Decisions"), bullet(""), h("Action items"), check("")] },
  { key: "work-project", category: "Work & Productivity", label: "Project tracker", description: "Scope, milestones, status", icon: "📊", build: () => [h("Project"), para("Owner: "), h("Scope"), para(""), h("Milestones"), check(""), h("Status / blockers"), para("")] },
  { key: "okrs", category: "Work & Productivity", label: "OKRs / goals", description: "Objectives and key results", icon: "🏆", build: () => [h("OKRs"), para("Quarter: "), h("Objective 1"), bullet("Key result — "), h("Objective 2"), bullet("Key result — ")] },
  { key: "weekly-planner", category: "Work & Productivity", label: "Weekly planner", description: "Plan and review your week", icon: "📅", build: () => [h("Weekly planner"), para("Week of: "), h("Priorities"), check(""), h("Schedule"), para(""), h("Review"), para("")] },

  { key: "daily-journal", category: "Personal & Health", label: "Daily journal", description: "Reflect on your day", icon: "🌅", build: () => [h("Daily journal"), para("Date: "), h("How I feel"), para(""), h("Highlights"), bullet(""), h("Grateful for"), bullet("")] },
  { key: "habit-tracker", category: "Personal & Health", label: "Habit tracker", description: "Track daily habits", icon: "🔁", build: () => [h("Habit tracker"), para("Week of: "), check("Habit 1"), check("Habit 2"), check("Habit 3"), h("Notes"), para("")] },
  { key: "workout-log", category: "Personal & Health", label: "Workout log", description: "Log workouts and sets", icon: "💪", build: () => [h("Workout log"), para("Date: "), para("Focus: "), h("Exercises"), check("Exercise — sets x reps"), h("Notes"), para("")] },
  { key: "travel-plan", category: "Personal & Health", label: "Travel plan", description: "Plan a trip", icon: "✈️", build: () => [h("Travel plan"), para("Destination: "), para("Dates: "), h("Itinerary"), bullet(""), h("Packing list"), check(""), h("Bookings"), para("")] },
];

const BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

export function buildTemplate(key: string): PresetBlock[] {
  const t = BY_KEY.get(key);
  return t ? t.build() : [para()];
}

export function templateIcon(key: string): string {
  return BY_KEY.get(key)?.icon ?? "📄";
}
