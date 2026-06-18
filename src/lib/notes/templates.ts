/** A partial BlockNote block used to seed a page from a template.
 * Supports props (e.g. heading level, callout emoji) — BlockNote fills the rest. */
export interface PresetBlock {
  type: string;
  props?: Record<string, unknown>;
  content?: string;
}

// ---- block helpers ----
const p = (text = ""): PresetBlock => ({ type: "paragraph", content: text });
const h1 = (text: string): PresetBlock => ({ type: "heading", props: { level: 1 }, content: text });
const h2 = (text: string): PresetBlock => ({ type: "heading", props: { level: 2 }, content: text });
const h3 = (text: string): PresetBlock => ({ type: "heading", props: { level: 3 }, content: text });
const check = (text = ""): PresetBlock => ({ type: "checkListItem", content: text });
const bullet = (text = ""): PresetBlock => ({ type: "bulletListItem", content: text });
const numbered = (text = ""): PresetBlock => ({ type: "numberedListItem", content: text });
const quote = (text: string): PresetBlock => ({ type: "quote", content: text });
const callout = (emoji: string, text: string): PresetBlock => ({ type: "callout", props: { emoji }, content: text });
const divider = (): PresetBlock => ({ type: "divider" });
const toc = (): PresetBlock => ({ type: "tableOfContents" });

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
  // ─────────────── Basic ───────────────
  { key: "blank", category: "Basic", label: "Blank page", description: "Start from scratch", icon: "📄",
    build: () => [p()] },
  { key: "todo", category: "Basic", label: "To-do list", description: "A checklist with priorities", icon: "✅",
    build: () => [
      h1("✅ To-do list"),
      callout("🎯", "Today's top priority: "),
      h2("Today"), check("First task"), check("Second task"), check(""),
      h2("Later"), check(""), check(""),
      divider(), h3("✔️ Done"), check("Example completed task"),
    ] },
  { key: "meeting", category: "Basic", label: "Meeting notes", description: "Agenda, decisions, action items", icon: "📝",
    build: () => [
      h1("📝 Meeting notes"),
      callout("📌", "One-line summary of the meeting (fill in after)."),
      h2("Details"), p("📅 Date: "), p("👥 Attendees: "), p("🎯 Goal: "),
      divider(),
      h2("🗂 Agenda"), bullet("Topic 1"), bullet("Topic 2"), bullet("Topic 3"),
      h2("🗒 Notes"), p(),
      h2("✅ Decisions"), bullet(""),
      h2("📋 Action items"), check("Owner — task — due"), check(""),
      divider(), h3("🔗 Resources"), bullet(""),
    ] },
  { key: "journal", category: "Basic", label: "Daily journal", description: "Reflect, prioritise, be grateful", icon: "📔",
    build: () => [
      h1("📔 Journal"), p("📅 Date: "),
      callout("🌤", "How am I feeling today?"),
      h2("✨ Highlights"), bullet(""),
      h2("🎯 Top 3 priorities"), check(""), check(""), check(""),
      h2("🙏 Grateful for"), bullet(""), bullet(""),
      divider(), h2("🌙 Reflection"), quote("What went well, and what would I do differently?"), p(),
    ] },
  { key: "project", category: "Basic", label: "Project tracker", description: "Goals, milestones, status", icon: "🎯",
    build: () => [
      h1("🎯 Project name"),
      callout("🚀", "What is this project and why does it matter?"),
      h2("Overview"), p("👤 Owner: "), p("📅 Timeline: "), p("📊 Status: Not started"),
      toc(),
      divider(),
      h2("🎯 Goals"), bullet(""), bullet(""),
      h2("🪧 Milestones"), check("Milestone 1"), check("Milestone 2"), check(""),
      h2("📝 Notes"), p(),
      h2("⚠️ Risks / blockers"), bullet(""),
    ] },

  // ─────────────── Students ───────────────
  { key: "study-planner", category: "Students", label: "Study planner", description: "Plan study sessions by subject", icon: "📚",
    build: () => [
      h1("📚 Study planner"), p("🗓 Week of: "),
      callout("🎯", "Goal for this week: "),
      h2("Subjects"), check("Subject 1 — chapters / topics"), check("Subject 2 — "), check(""),
      h2("⏰ Today's focus"), numbered(""), numbered(""),
      divider(), h2("📝 Notes & reminders"), p(),
    ] },
  { key: "lecture-notes", category: "Students", label: "Course / lecture notes", description: "Cornell-style structured notes", icon: "🎓",
    build: () => [
      h1("🎓 Lecture notes"), p("📘 Course: "), p("📅 Date: "), p("🧑‍🏫 Topic: "),
      callout("💡", "Key question this lecture answers: "),
      h2("📌 Key points"), bullet(""), bullet(""), bullet(""),
      h2("❓ Questions"), bullet(""),
      h2("🔑 Vocabulary"), bullet("Term — definition"),
      divider(), h2("🧠 Summary"), quote("Summarise the lecture in 2–3 sentences."), p(),
    ] },
  { key: "assignment-tracker", category: "Students", label: "Assignment & exam tracker", description: "Track due dates and grades", icon: "🗓️",
    build: () => [
      h1("🗓️ Assignments & exams"),
      callout("⏰", "Next deadline: "),
      h2("📥 Upcoming"), check("Assignment — course — due "), check("Exam — course — date "), check(""),
      h2("🔄 In progress"), check(""),
      divider(), h2("✅ Completed"), check("Example — grade: "),
    ] },
  { key: "reading-notes", category: "Students", label: "Reading notes", description: "Capture takeaways from a text", icon: "📖",
    build: () => [
      h1("📖 Reading notes"), p("📕 Title: "), p("✍️ Author: "), p("📄 Pages / chapter: "),
      callout("💡", "Why am I reading this?"),
      h2("🔑 Key takeaways"), bullet(""), bullet(""), bullet(""),
      h2("📝 Favourite quotes"), quote(""),
      divider(), h2("🧠 My thoughts"), p(),
    ] },

  // ─────────────── Hobbies ───────────────
  { key: "hobby-tracker", category: "Hobbies", label: "Hobby tracker", description: "Track time & progress on a hobby", icon: "🎨",
    build: () => [
      h1("🎨 Hobby tracker"), p("🎭 Hobby: "),
      callout("🎯", "What do I want to get better at?"),
      h2("🗓 Sessions"), check("Session — date — what I did"), check(""),
      h2("📈 Progress"), bullet(""),
      divider(), h2("🏆 Goals"), check(""), check(""),
    ] },
  { key: "project-log", category: "Hobbies", label: "Project log", description: "Log progress on a personal project", icon: "🛠️",
    build: () => [
      h1("🛠️ Project log"), p("📦 Project: "), p("📅 Started: "),
      callout("✨", "The vision in one sentence: "),
      h2("📓 Log"), p("— "), p("— "),
      h2("👉 Next steps"), check(""), check(""),
      divider(), h2("💭 Ideas / backlog"), bullet(""),
    ] },
  { key: "practice-journal", category: "Hobbies", label: "Practice journal", description: "Track practice and improvement", icon: "🎸",
    build: () => [
      h1("🎸 Practice journal"), p("📅 Date: "), p("⏱ Time: "),
      h2("🎯 What I practised"), bullet(""), bullet(""),
      callout("✅", "Win of the day: "),
      h2("📈 To improve"), bullet(""),
      divider(), h2("🗒 Notes"), p(),
    ] },
  { key: "collection", category: "Hobbies", label: "Collection list", description: "Catalogue a collection or wishlist", icon: "🗂️",
    build: () => [
      h1("🗂️ Collection"),
      callout("📦", "What am I collecting?"),
      h2("✅ Owned"), check("Item 1"), check("Item 2"), check(""),
      h2("⭐ Wishlist"), check(""), check(""),
      divider(), h2("🗒 Notes"), p(),
    ] },

  // ─────────────── Work & Productivity ───────────────
  { key: "work-meeting", category: "Work & Productivity", label: "Meeting notes", description: "Agenda, decisions, action items", icon: "🧑‍💼",
    build: () => [
      h1("🧑‍💼 Meeting"),
      callout("📌", "TL;DR — the one thing to remember."),
      p("📅 Date: "), p("👥 Attendees: "),
      divider(),
      h2("🗂 Agenda"), bullet(""), bullet(""),
      h2("✅ Decisions"), bullet(""),
      h2("📋 Action items"), check("Owner — task — due"), check(""),
      h2("⏭ Follow-ups"), bullet(""),
    ] },
  { key: "work-project", category: "Work & Productivity", label: "Project brief", description: "Scope, milestones, status", icon: "📊",
    build: () => [
      h1("📊 Project brief"),
      callout("🎯", "Objective: what success looks like."),
      p("👤 Owner: "), p("👥 Team: "), p("📅 Timeline: "), p("📈 Status: "),
      toc(), divider(),
      h2("🧱 Background"), p(),
      h2("🧭 Scope"), h3("In scope"), bullet(""), h3("Out of scope"), bullet(""),
      h2("🪧 Milestones"), check(""), check(""),
      h2("⚠️ Risks"), bullet(""),
    ] },
  { key: "okrs", category: "Work & Productivity", label: "OKRs / goals", description: "Objectives and measurable key results", icon: "🏆",
    build: () => [
      h1("🏆 OKRs"), p("📅 Quarter: "),
      callout("🧭", "Our focus this quarter, in one line."),
      h2("🎯 Objective 1"), p("Why it matters: "),
      bullet("KR — metric, from → to"), bullet("KR — "),
      h2("🎯 Objective 2"), bullet("KR — "),
      divider(), h2("📈 Weekly check-in"), p(),
    ] },
  { key: "weekly-planner", category: "Work & Productivity", label: "Weekly planner", description: "Plan, schedule, and review the week", icon: "📅",
    build: () => [
      h1("📅 Weekly planner"), p("🗓 Week of: "),
      callout("🎯", "Top 3 outcomes for the week:"),
      check(""), check(""), check(""),
      divider(),
      h2("📆 Schedule"), h3("Mon"), p(), h3("Tue"), p(), h3("Wed"), p(), h3("Thu"), p(), h3("Fri"), p(),
      divider(), h2("🔁 Weekly review"), quote("Wins, lessons, and what to carry into next week."), p(),
    ] },

  // ─────────────── Personal & Health ───────────────
  { key: "daily-journal", category: "Personal & Health", label: "Daily journal", description: "A calm daily reflection", icon: "🌅",
    build: () => [
      h1("🌅 Daily journal"), p("📅 Date: "),
      callout("🧘", "How am I feeling, in one word?"),
      h2("✨ Highlights"), bullet(""),
      h2("🙏 Grateful for"), bullet(""), bullet(""),
      h2("🎯 Tomorrow's focus"), check(""),
      divider(), h2("💭 Free write"), p(),
    ] },
  { key: "habit-tracker", category: "Personal & Health", label: "Habit tracker", description: "Build and track daily habits", icon: "🔁",
    build: () => [
      h1("🔁 Habit tracker"), p("🗓 Week of: "),
      callout("🌱", "The habit I'm building and why: "),
      h2("Daily habits"), check("💧 Drink water"), check("🏃 Move 30 min"), check("📖 Read"), check("🧘 Meditate"), check(""),
      divider(), h2("📈 Reflection"), p("Streak: "), p("What helped / what got in the way: "),
    ] },
  { key: "workout-log", category: "Personal & Health", label: "Workout log", description: "Log workouts, sets, and progress", icon: "💪",
    build: () => [
      h1("💪 Workout log"), p("📅 Date: "), p("🎯 Focus: "),
      callout("🔥", "Goal for this session: "),
      h2("🏋️ Exercises"), check("Exercise — sets × reps × weight"), check(""), check(""),
      h2("🤸 Warm-up / mobility"), bullet(""),
      divider(), h2("🗒 How it felt"), p(),
    ] },
  { key: "travel-plan", category: "Personal & Health", label: "Travel plan", description: "Plan a trip end to end", icon: "✈️",
    build: () => [
      h1("✈️ Travel plan"), p("📍 Destination: "), p("🗓 Dates: "), p("💰 Budget: "),
      callout("🌟", "What do I most want from this trip?"),
      toc(), divider(),
      h2("🗺 Itinerary"), h3("Day 1"), bullet(""), h3("Day 2"), bullet(""),
      h2("🧳 Packing list"), check(""), check(""),
      h2("📌 Bookings"), bullet("Flights — "), bullet("Stay — "),
      divider(), h2("🍽 Places to try"), bullet(""),
    ] },
];

const BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

export function buildTemplate(key: string): PresetBlock[] {
  const t = BY_KEY.get(key);
  return t ? t.build() : [p()];
}

export function templateIcon(key: string): string {
  return BY_KEY.get(key)?.icon ?? "📄";
}
