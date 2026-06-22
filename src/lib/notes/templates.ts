import type { DBProperty, DBView, DBRow } from "@/lib/models/notes-database";
import { genId } from "@/lib/notes/database";

/** A partial BlockNote block used to seed a page from a template.
 * Supports props (e.g. heading level, callout emoji) — BlockNote fills the rest. */
export interface PresetBlock {
  type: string;
  props?: Record<string, unknown>;
  content?: string;
  children?: PresetBlock[];
}

/** Sentinel databaseId the server swaps for a freshly-created database when a
 * template carries a `database` definition (build() is pure, so it can't make
 * one itself). A template may embed several, each with its own sentinel. */
export const TEMPLATE_DB_SENTINEL = "__TEMPLATE_DB__";

/** A database block placeholder for a template; the server fills in the real id.
 * Pass a distinct sentinel when a template has more than one database. */
const dbBlock = (sentinel: string = TEMPLATE_DB_SENTINEL): PresetBlock =>
  ({ type: "database", props: { databaseId: sentinel } });

export interface TemplateDatabase {
  title: string;
  icon: string;
  properties: DBProperty[];
  views: DBView[];
  rows: DBRow[];
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
/** A multi-column row (Notion's side-by-side layout). Each arg is one column's blocks. */
const columns = (...cols: PresetBlock[][]): PresetBlock =>
  ({ type: "columnList", children: cols.map((blocks) => ({ type: "column", children: blocks })) });
/** A callout with nested blocks inside (icon + a mini-section), like Notion's cards. */
const calloutCard = (emoji: string, children: PresetBlock[]): PresetBlock =>
  ({ type: "callout", props: { emoji }, content: "", children });

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
  /** Optional: a database created server-side; its block goes where dbBlock() is. */
  database?: () => TemplateDatabase;
  /** Optional: several databases keyed by their dbBlock(sentinel) placeholder. */
  databases?: () => Record<string, TemplateDatabase>;
}

/** Build a task-tracker database (Notion's signature template): Name/Status/
 * Priority/Due, shown as a Board (grouped by Status) + Table, with seed rows. */
function taskTrackerDB(): TemplateDatabase {
  const name = genId("p", 1), status = genId("p", 2), priority = genId("p", 3), due = genId("p", 4);
  const opt = (s: number, label: string, color: string) => ({ id: genId("o", s), label, color });
  const todo = opt(10, "To Do", "gray"), doing = opt(11, "In Progress", "blue"), done = opt(12, "Done", "green");
  const lo = opt(20, "Low", "gray"), med = opt(21, "Medium", "yellow"), hi = opt(22, "High", "red");
  const row = (s: number, title: string, st: string, pr: string): DBRow =>
    ({ id: genId("r", s), cells: { [name]: title, [status]: st, [priority]: pr } });
  return {
    title: "Tasks", icon: "✅",
    properties: [
      { id: name, name: "Name", type: "title" },
      { id: status, name: "Status", type: "status", options: [todo, doing, done] },
      { id: priority, name: "Priority", type: "select", options: [lo, med, hi] },
      { id: due, name: "Due", type: "date" },
    ],
    views: [
      { id: genId("v", 1), name: "Board", type: "board", groupBy: status },
      { id: genId("v", 2), name: "Table", type: "table" },
    ],
    rows: [
      row(1, "Plan the week", "To Do", "High"),
      row(2, "Draft the proposal", "In Progress", "Medium"),
      row(3, "Review notes", "Done", "Low"),
    ],
  };
}

/** Reading list — a gallery (with cover images) + table: Title/Author/Status/
 * Rating/Cover. Showcases the gallery cover-image view. */
function readingListDB(): TemplateDatabase {
  const title = genId("q", 1), author = genId("q", 2), status = genId("q", 3), rating = genId("q", 4), cover = genId("q", 5);
  const opt = (s: number, label: string, color: string) => ({ id: genId("u", s), label, color });
  const toRead = opt(1, "To Read", "gray"), reading = opt(2, "Reading", "blue"), done = opt(3, "Finished", "green");
  const r5 = opt(5, "★★★★★", "yellow"), r4 = opt(4, "★★★★", "yellow");
  const row = (s: number, t: string, a: string, st: string): DBRow =>
    ({ id: genId("s", s), cells: { [title]: t, [author]: a, [status]: st } });
  return {
    title: "Reading list", icon: "📚",
    properties: [
      { id: title, name: "Title", type: "title" },
      { id: author, name: "Author", type: "text" },
      { id: status, name: "Status", type: "status", options: [toRead, reading, done] },
      { id: rating, name: "Rating", type: "select", options: [r4, r5] },
      { id: cover, name: "Cover", type: "image" },
    ],
    views: [
      { id: genId("w", 1), name: "Gallery", type: "gallery" },
      { id: genId("w", 2), name: "Table", type: "table" },
    ],
    rows: [
      row(1, "Atomic Habits", "James Clear", "Finished"),
      row(2, "Deep Work", "Cal Newport", "Reading"),
      row(3, "The Pragmatic Programmer", "Hunt & Thomas", "To Read"),
    ],
  };
}

/** Content calendar — a calendar (by publish date) + table: Title/Status/
 * Date/Channel. Exercises the calendar view with status-colored event pills. */
function contentCalendarDB(): TemplateDatabase {
  const title = genId("c", 1), status = genId("c", 2), date = genId("c", 3), channel = genId("c", 4);
  const opt = (s: number, label: string, color: string) => ({ id: genId("k", s), label, color });
  const idea = opt(1, "Idea", "gray"), draft = opt(2, "Draft", "yellow"), scheduled = opt(3, "Scheduled", "blue"), published = opt(4, "Published", "green");
  const blog = opt(10, "Blog", "purple"), x = opt(11, "Twitter/X", "blue"), news = opt(12, "Newsletter", "orange");
  const row = (s: number, t: string, st: string, ch: string[]): DBRow =>
    ({ id: genId("d", s), cells: { [title]: t, [status]: st, [channel]: ch } });
  return {
    title: "Content calendar", icon: "🗓️",
    properties: [
      { id: title, name: "Title", type: "title" },
      { id: status, name: "Status", type: "status", options: [idea, draft, scheduled, published] },
      { id: date, name: "Publish date", type: "date" },
      { id: channel, name: "Channel", type: "multi_select", options: [blog, x, news] },
    ],
    views: [
      { id: genId("e", 1), name: "Calendar", type: "calendar" },
      { id: genId("e", 2), name: "Board", type: "board", groupBy: status },
      { id: genId("e", 3), name: "Table", type: "table" },
    ],
    rows: [
      row(1, "Launch announcement", "Scheduled", ["Blog", "Newsletter"]),
      row(2, "Weekly tips thread", "Draft", ["Twitter/X"]),
      row(3, "Case study", "Idea", ["Blog"]),
    ],
  };
}

/** Simple CRM — contacts as a board (by stage) + table: Name/Company/Email/
 * Stage/Last contact. A classic Notion database template. */
function crmDB(): TemplateDatabase {
  const name = genId("m", 1), company = genId("m", 2), email = genId("m", 3), stage = genId("m", 4), last = genId("m", 5);
  const opt = (s: number, label: string, color: string) => ({ id: genId("g", s), label, color });
  const lead = opt(1, "Lead", "gray"), contacted = opt(2, "Contacted", "yellow"), active = opt(3, "Active", "blue"), won = opt(4, "Won", "green"), lost = opt(5, "Lost", "red");
  const row = (s: number, n: string, co: string, st: string): DBRow =>
    ({ id: genId("h", s), cells: { [name]: n, [company]: co, [stage]: st } });
  return {
    title: "Contacts", icon: "🤝",
    properties: [
      { id: name, name: "Name", type: "title" },
      { id: company, name: "Company", type: "text" },
      { id: email, name: "Email", type: "url" },
      { id: stage, name: "Stage", type: "status", options: [lead, contacted, active, won, lost] },
      { id: last, name: "Last contact", type: "date" },
    ],
    views: [
      { id: genId("i", 1), name: "Board", type: "board", groupBy: stage },
      { id: genId("i", 2), name: "Table", type: "table" },
    ],
    rows: [
      row(1, "Alex Rivera", "Acme Inc.", "Lead"),
      row(2, "Sam Chen", "Globex", "Active"),
      row(3, "Jordan Lee", "Initech", "Contacted"),
    ],
  };
}

/** Student dashboard databases (English-Build style): a Subjects gallery + a
 * weekly Schedule board, embedded on one page via two sentinels. */
const DB_SUBJECTS = "__DB_SUBJECTS__";
const DB_SCHEDULE = "__DB_SCHEDULE__";
function subjectsDB(): TemplateDatabase {
  const name = genId("sa", 1), status = genId("sa", 2), cover = genId("sa", 3);
  const opt = (s: number, l: string, c: string) => ({ id: genId("sb", s), label: l, color: c });
  const st = [opt(1, "Not started", "gray"), opt(2, "Learning", "blue"), opt(3, "Confident", "green")];
  const row = (s: number, n: string, v: string): DBRow => ({ id: genId("sc", s), cells: { [name]: n, [status]: v } });
  return {
    title: "Subjects", icon: "🎧",
    properties: [
      { id: name, name: "Subject", type: "title" },
      { id: status, name: "Status", type: "status", options: st },
      { id: cover, name: "Cover", type: "image" },
    ],
    views: [{ id: genId("sd", 1), name: "Gallery", type: "gallery" }, { id: genId("sd", 2), name: "Table", type: "table" }],
    rows: [row(1, "Listening", "Learning"), row(2, "Reading", "Not started"), row(3, "Speaking", "Confident"), row(4, "Writing", "Learning")],
  };
}
function scheduleDB(): TemplateDatabase {
  const task = genId("ta", 1), day = genId("ta", 2), dur = genId("ta", 3);
  const opt = (s: number, l: string) => ({ id: genId("tb", s), label: l, color: "default" });
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d, i) => opt(i + 1, d));
  const row = (s: number, t: string, d: string, du: string): DBRow => ({ id: genId("tc", s), cells: { [task]: t, [day]: d, [dur]: du } });
  return {
    title: "Schedule", icon: "📅",
    properties: [
      { id: task, name: "Task", type: "title" },
      { id: day, name: "Day", type: "select", options: days },
      { id: dur, name: "Duration", type: "text" },
    ],
    views: [{ id: genId("td", 1), name: "By day", type: "board", groupBy: day }, { id: genId("td", 2), name: "Table", type: "table" }],
    rows: [row(1, "Grammar", "Monday", "30 min"), row(2, "Listening", "Tuesday", "30 min"), row(3, "Vocabulary", "Wednesday", "30 min")],
  };
}

/** Habit tracker database — habits as a table + board (by category): Habit/
 * Category/Frequency/Done today/Streak. */
function habitDB(): TemplateDatabase {
  const habit = genId("ha", 1), cat = genId("ha", 2), freq = genId("ha", 3), done = genId("ha", 4), streak = genId("ha", 5);
  const o = (s: number, l: string, c: string) => ({ id: genId("hb", s), label: l, color: c });
  const cats = [o(1, "Health", "green"), o(2, "Mind", "purple"), o(3, "Work", "blue")];
  const freqs = [o(10, "Daily", "blue"), o(11, "Weekly", "orange")];
  const row = (s: number, h: string, c: string, f: string): DBRow => ({ id: genId("hc", s), cells: { [habit]: h, [cat]: c, [freq]: f } });
  return {
    title: "Habits", icon: "🔁",
    properties: [
      { id: habit, name: "Habit", type: "title" },
      { id: cat, name: "Category", type: "select", options: cats },
      { id: freq, name: "Frequency", type: "select", options: freqs },
      { id: done, name: "Done today", type: "checkbox" },
      { id: streak, name: "Streak", type: "number" },
    ],
    views: [{ id: genId("hd", 1), name: "Table", type: "table" }, { id: genId("hd", 2), name: "By category", type: "board", groupBy: cat }],
    rows: [row(1, "💧 Drink water", "Health", "Daily"), row(2, "🧘 Meditate", "Mind", "Daily"), row(3, "📖 Read", "Mind", "Daily"), row(4, "🏃 Exercise", "Health", "Weekly")],
  };
}

/** Roadmap databases (Python-Roadmap style): Chapters with a Progress rollup
 * ring over related Steps' Done checkbox. Built together so chapter rows can
 * link real step row ids; the server swaps the relation's target db id. */
const DB_CHAPTERS = "__DB_CHAPTERS__";
const DB_STEPS = "__DB_STEPS__";
function roadmapDBs(): Record<string, TemplateDatabase> {
  // Steps
  const sName = genId("ra", 1), sDone = genId("ra", 2), sChap = genId("ra", 3);
  const sid = [1, 2, 3, 4, 5, 6].map((i) => genId("rr", i));
  const step = (id: string, n: string, done: boolean): DBRow => ({ id, cells: { [sName]: n, [sDone]: done } });
  const steps: TemplateDatabase = {
    title: "Steps", icon: "🪜",
    properties: [
      { id: sName, name: "Lesson", type: "title" },
      { id: sDone, name: "Done", type: "checkbox" },
      { id: sChap, name: "Chapter", type: "relation", relationDbId: DB_CHAPTERS },
    ],
    views: [{ id: genId("rd", 1), name: "Table", type: "table" }],
    rows: [
      step(sid[0], "Setup & basics", true), step(sid[1], "Variables", true), step(sid[2], "Control flow", false),
      step(sid[3], "Functions", false), step(sid[4], "Modules", false), step(sid[5], "Files & errors", false),
    ],
  };
  // Chapters (relation → Steps, + a percent-checked rollup over Steps' Done)
  const cName = genId("rb", 1), cSteps = genId("rb", 2), cProg = genId("rb", 3);
  const chapters: TemplateDatabase = {
    title: "Chapters", icon: "📘",
    properties: [
      { id: cName, name: "Chapter", type: "title" },
      { id: cSteps, name: "Steps", type: "relation", relationDbId: DB_STEPS },
      { id: cProg, name: "Progress", type: "rollup", rollupRelation: cSteps, rollupTarget: sDone, rollupFn: "percent_checked" },
    ],
    views: [{ id: genId("re", 1), name: "Table", type: "table" }, { id: genId("re", 2), name: "Gallery", type: "gallery" }],
    rows: [
      { id: genId("rc", 1), cells: { [cName]: "Beginner", [cSteps]: [sid[0], sid[1], sid[2]] } },
      { id: genId("rc", 2), cells: { [cName]: "Intermediate", [cSteps]: [sid[3], sid[4], sid[5]] } },
    ],
  };
  return { [DB_CHAPTERS]: chapters, [DB_STEPS]: steps };
}

export const TEMPLATES: NotesTemplate[] = [
  // ─────────────── Basic ───────────────
  { key: "blank", category: "Basic", label: "Blank page", description: "Start from scratch", icon: "📄",
    build: () => [p()] },
  { key: "todo", category: "Basic", label: "To-do list", description: "A checklist with priorities", icon: "✅",
    build: () => [
      h1("✅ To-do list"),
      callout("🎯", "Today's top priority: "),
      columns(
        [
          h2("Today"), check("First task"), check("Second task"), check(""),
        ],
        [
          h2("Later"), check(""), check(""),
        ],
      ),
      divider(), h3("✔️ Done"), check("Example completed task"),
    ] },
  { key: "meeting", category: "Basic", label: "Meeting notes", description: "Agenda, decisions, action items", icon: "📝",
    build: () => [
      h1("📝 Meeting notes"),
      callout("📌", "One-line summary of the meeting (fill in after)."),
      h2("Details"), p("📅 Date: "), p("👥 Attendees: "), p("🎯 Goal: "),
      divider(),
      columns(
        [
          h2("🗂 Agenda"), bullet("Topic 1"), bullet("Topic 2"), bullet("Topic 3"),
          h2("🗒 Notes"), p(),
        ],
        [
          h2("✅ Decisions"), bullet(""),
          h2("📋 Action items"), check("Owner — task — due"), check(""),
        ],
      ),
      divider(), h3("🔗 Resources"), bullet(""),
    ] },
  { key: "journal", category: "Basic", label: "Daily journal", description: "Reflect, prioritise, be grateful", icon: "📔",
    build: () => [
      h1("📔 Journal"), p("📅 Date: "),
      callout("🌤", "How am I feeling today?"),
      columns(
        [
          h2("✨ Highlights"), bullet(""),
          h2("🎯 Top 3 priorities"), check(""), check(""), check(""),
        ],
        [
          h2("🙏 Grateful for"), bullet(""), bullet(""),
          h2("🌙 Reflection"), quote("What went well, and what would I do differently?"), p(),
        ],
      ),
    ] },
  { key: "project", category: "Basic", label: "Project tracker", description: "Goals, milestones, status", icon: "🎯",
    build: () => [
      h1("🎯 Project name"),
      callout("🚀", "What is this project and why does it matter?"),
      h2("Overview"), p("👤 Owner: "), p("📅 Timeline: "), p("📊 Status: Not started"),
      divider(),
      // Two-column layout (Notion-style): Risks & Notes on the left, Goals &
      // Milestones on the right.
      columns(
        [
          h2("⚠️ Risks / blockers"), bullet(""), bullet(""),
          h2("📝 Notes"), p(),
        ],
        [
          h2("🎯 Goals"), bullet(""), bullet(""),
          h2("🪧 Milestones"), check("Milestone 1"), check("Milestone 2"), check(""),
        ],
      ),
    ] },

  // ─────────────── Students ───────────────
  { key: "student-dashboard", category: "Students", label: "Student dashboard", description: "Goals + a subjects gallery + a weekly schedule board", icon: "🎓",
    build: () => [
      h1("🎓 Student dashboard"),
      calloutCard("🏆", [h3("Goals"), check("Master 5 new words this week"), check("Watch one talk and note 3 phrases"), check("")]),
      divider(),
      h2("🎧 Subjects"), dbBlock(DB_SUBJECTS),
      h2("📅 Weekly schedule"), dbBlock(DB_SCHEDULE),
    ],
    databases: () => ({ [DB_SUBJECTS]: subjectsDB(), [DB_SCHEDULE]: scheduleDB() }) },
  { key: "language-tracker", category: "Students", label: "Language tracker", description: "Vocabulary, grammar & goals in a card layout", icon: "🗣️",
    build: () => [
      h1("🗣️ Language tracker"),
      columns(
        [callout("👋", "Welcome! Track vocabulary, grammar, and daily practice — all in one place.")],
        [p("Set a weekly goal, log new words, and review your progress over time.")],
      ),
      divider(),
      h2("📦 Trackers"),
      columns(
        [
          calloutCard("📖", [h3("Vocabulary"), p("Log new words and review them."), check("Add today's words")]),
          calloutCard("✍️", [h3("Grammar"), p("Notes on key patterns and rules."), bullet("")]),
        ],
        [
          calloutCard("🔤", [h3("Kanji / Characters"), p("Track characters you've learned."), check("")]),
          calloutCard("🎯", [h3("Daily goals"), p("Small daily targets keep momentum."), check("10 min review"), check("3 new words")]),
        ],
      ),
      divider(),
      h2("📈 Progress"),
      callout("🏆", "Milestones reached and next targets."),
      bullet(""),
    ] },
  { key: "study-planner", category: "Students", label: "Study planner", description: "Plan study sessions by subject", icon: "📚",
    build: () => [
      h1("📚 Study planner"), p("🗓 Week of: "),
      callout("🎯", "Goal for this week: "),
      columns(
        [
          h2("Subjects"), check("Subject 1 — chapters / topics"), check("Subject 2 — "), check(""),
        ],
        [
          h2("⏰ Today's focus"), numbered(""), numbered(""),
          h2("📝 Notes & reminders"), p(),
        ],
      ),
    ] },
  { key: "lecture-notes", category: "Students", label: "Course / lecture notes", description: "Cornell-style structured notes", icon: "🎓",
    build: () => [
      h1("🎓 Lecture notes"), p("📘 Course: "), p("📅 Date: "), p("🧑‍🏫 Topic: "),
      callout("💡", "Key question this lecture answers: "),
      columns(
        [
          h2("📌 Key points"), bullet(""), bullet(""), bullet(""),
        ],
        [
          h2("❓ Questions"), bullet(""),
          h2("🔑 Vocabulary"), bullet("Term — definition"),
        ],
      ),
      divider(), h2("🧠 Summary"), quote("Summarise the lecture in 2–3 sentences."), p(),
    ] },
  { key: "assignment-tracker", category: "Students", label: "Assignment & exam tracker", description: "Track due dates and grades", icon: "🗓️",
    build: () => [
      h1("🗓️ Assignments & exams"),
      callout("⏰", "Next deadline: "),
      columns(
        [
          h2("📥 Upcoming"), check("Assignment — course — due "), check("Exam — course — date "), check(""),
        ],
        [
          h2("🔄 In progress"), check(""),
          h2("✅ Completed"), check("Example — grade: "),
        ],
      ),
    ] },
  { key: "reading-notes", category: "Students", label: "Reading notes", description: "Capture takeaways from a text", icon: "📖",
    build: () => [
      h1("📖 Reading notes"), p("📕 Title: "), p("✍️ Author: "), p("📄 Pages / chapter: "),
      callout("💡", "Why am I reading this?"),
      columns(
        [
          h2("🔑 Key takeaways"), bullet(""), bullet(""), bullet(""),
        ],
        [
          h2("📝 Favourite quotes"), quote(""),
          h2("🧠 My thoughts"), p(),
        ],
      ),
    ] },

  // ─────────────── Hobbies ───────────────
  { key: "reading-list", category: "Hobbies", label: "Reading list", description: "A gallery of books with covers, status & rating", icon: "📚",
    build: () => [
      h1("📚 Reading list"),
      callout("💡", "Add a cover image to each book to make the gallery shine."),
      dbBlock(),
    ],
    database: readingListDB },
  { key: "hobby-tracker", category: "Hobbies", label: "Hobby tracker", description: "Track time & progress on a hobby", icon: "🎨",
    build: () => [
      h1("🎨 Hobby tracker"), p("🎭 Hobby: "),
      callout("🎯", "What do I want to get better at?"),
      columns(
        [
          h2("🗓 Sessions"), check("Session — date — what I did"), check(""),
        ],
        [
          h2("📈 Progress"), bullet(""),
          h2("🏆 Goals"), check(""), check(""),
        ],
      ),
    ] },
  { key: "project-log", category: "Hobbies", label: "Project log", description: "Log progress on a personal project", icon: "🛠️",
    build: () => [
      h1("🛠️ Project log"), p("📦 Project: "), p("📅 Started: "),
      callout("✨", "The vision in one sentence: "),
      columns(
        [
          h2("📓 Log"), p("— "), p("— "),
        ],
        [
          h2("👉 Next steps"), check(""), check(""),
          h2("💭 Ideas / backlog"), bullet(""),
        ],
      ),
    ] },
  { key: "practice-journal", category: "Hobbies", label: "Practice journal", description: "Track practice and improvement", icon: "🎸",
    build: () => [
      h1("🎸 Practice journal"), p("📅 Date: "), p("⏱ Time: "),
      callout("✅", "Win of the day: "),
      columns(
        [
          h2("🎯 What I practised"), bullet(""), bullet(""),
        ],
        [
          h2("📈 To improve"), bullet(""),
          h2("🗒 Notes"), p(),
        ],
      ),
    ] },
  { key: "collection", category: "Hobbies", label: "Collection list", description: "Catalogue a collection or wishlist", icon: "🗂️",
    build: () => [
      h1("🗂️ Collection"),
      callout("📦", "What am I collecting?"),
      columns(
        [
          h2("✅ Owned"), check("Item 1"), check("Item 2"), check(""),
        ],
        [
          h2("⭐ Wishlist"), check(""), check(""),
          h2("🗒 Notes"), p(),
        ],
      ),
    ] },

  // ─────────────── Work & Productivity ───────────────
  { key: "task-tracker", category: "Work & Productivity", label: "Task tracker", description: "A board + table database of tasks by status", icon: "✅",
    build: () => [
      h1("✅ Task tracker"),
      callout("🎯", "Drag cards between columns as work moves along."),
      dbBlock(),
    ],
    database: taskTrackerDB },
  { key: "content-calendar", category: "Work & Productivity", label: "Content calendar", description: "Plan posts on a calendar by publish date", icon: "🗓️",
    build: () => [
      h1("🗓️ Content calendar"),
      callout("📣", "Switch between Calendar, Board, and Table to plan your content."),
      dbBlock(),
    ],
    database: contentCalendarDB },
  { key: "crm", category: "Work & Productivity", label: "Simple CRM", description: "Track contacts & deals by stage (board + table)", icon: "🤝",
    build: () => [
      h1("🤝 Contacts"),
      callout("📇", "Move contacts across stages as deals progress."),
      dbBlock(),
    ],
    database: crmDB },
  { key: "roadmap", category: "Work & Productivity", label: "Learning roadmap", description: "Chapters with a progress ring over related steps", icon: "🗺️",
    build: () => [
      h1("🗺️ Learning roadmap"),
      callout("🚀", "Each chapter shows a live progress ring as you check off its steps."),
      h2("📘 Chapters"), dbBlock(DB_CHAPTERS),
      h2("🪜 Steps"), dbBlock(DB_STEPS),
    ],
    databases: roadmapDBs },
  { key: "work-meeting", category: "Work & Productivity", label: "Meeting notes", description: "Agenda, decisions, action items", icon: "🧑‍💼",
    build: () => [
      h1("🧑‍💼 Meeting"),
      callout("📌", "TL;DR — the one thing to remember."),
      p("📅 Date: "), p("👥 Attendees: "),
      divider(),
      columns(
        [
          h2("🗂 Agenda"), bullet(""), bullet(""),
          h2("✅ Decisions"), bullet(""),
        ],
        [
          h2("📋 Action items"), check("Owner — task — due"), check(""),
          h2("⏭ Follow-ups"), bullet(""),
        ],
      ),
    ] },
  { key: "work-project", category: "Work & Productivity", label: "Project brief", description: "Scope, milestones, status", icon: "📊",
    build: () => [
      h1("📊 Project brief"),
      callout("🎯", "Objective: what success looks like."),
      p("👤 Owner: "), p("👥 Team: "), p("📅 Timeline: "), p("📈 Status: "),
      divider(),
      h2("🧱 Background"), p(),
      // Side-by-side: Scope on the left, Milestones & Risks on the right.
      columns(
        [
          h2("🧭 Scope"), h3("In scope"), bullet(""), h3("Out of scope"), bullet(""),
        ],
        [
          h2("🪧 Milestones"), check(""), check(""),
          h2("⚠️ Risks"), bullet(""),
        ],
      ),
    ] },
  { key: "okrs", category: "Work & Productivity", label: "OKRs / goals", description: "Objectives and measurable key results", icon: "🏆",
    build: () => [
      h1("🏆 OKRs"), p("📅 Quarter: "),
      callout("🧭", "Our focus this quarter, in one line."),
      columns(
        [
          h2("🎯 Objective 1"), p("Why it matters: "),
          bullet("KR — metric, from → to"), bullet("KR — "),
        ],
        [
          h2("🎯 Objective 2"), bullet("KR — "),
          h2("📈 Weekly check-in"), p(),
        ],
      ),
    ] },
  { key: "weekly-planner", category: "Work & Productivity", label: "Weekly planner", description: "Plan, schedule, and review the week", icon: "📅",
    build: () => [
      h1("📅 Weekly planner"), p("🗓 Week of: "),
      callout("🎯", "Top 3 outcomes for the week:"),
      check(""), check(""), check(""),
      divider(),
      h2("📆 Schedule"),
      columns(
        [
          h3("Mon"), p(), h3("Tue"), p(), h3("Wed"), p(),
        ],
        [
          h3("Thu"), p(), h3("Fri"), p(),
          h2("🔁 Weekly review"), quote("Wins, lessons, and what to carry into next week."), p(),
        ],
      ),
    ] },

  // ─────────────── Personal & Health ───────────────
  { key: "daily-journal", category: "Personal & Health", label: "Daily journal", description: "A calm daily reflection", icon: "🌅",
    build: () => [
      h1("🌅 Daily journal"), p("📅 Date: "),
      callout("🧘", "How am I feeling, in one word?"),
      columns(
        [
          h2("✨ Highlights"), bullet(""),
          h2("🙏 Grateful for"), bullet(""), bullet(""),
        ],
        [
          h2("🎯 Tomorrow's focus"), check(""),
          h2("💭 Free write"), p(),
        ],
      ),
    ] },
  { key: "habit-tracker", category: "Personal & Health", label: "Habit tracker", description: "Build and track daily habits", icon: "🔁",
    build: () => [
      h1("🔁 Habit tracker"), p("🗓 Week of: "),
      callout("🌱", "The habit I'm building and why: "),
      columns(
        [
          h2("Daily habits"), check("💧 Drink water"), check("🏃 Move 30 min"), check("📖 Read"), check("🧘 Meditate"), check(""),
        ],
        [
          h2("📈 Reflection"), p("Streak: "), p("What helped / what got in the way: "),
        ],
      ),
    ] },
  { key: "habit-db", category: "Personal & Health", label: "Habit tracker (database)", description: "Habits in a table + board by category", icon: "🔁",
    build: () => [
      h1("🔁 Habit tracker"),
      callout("🌱", "Check off habits as you do them; group by category on the board."),
      dbBlock(),
    ],
    database: habitDB },
  { key: "workout-log", category: "Personal & Health", label: "Workout log", description: "Log workouts, sets, and progress", icon: "💪",
    build: () => [
      h1("💪 Workout log"), p("📅 Date: "), p("🎯 Focus: "),
      callout("🔥", "Goal for this session: "),
      columns(
        [
          h2("🏋️ Exercises"), check("Exercise — sets × reps × weight"), check(""), check(""),
        ],
        [
          h2("🤸 Warm-up / mobility"), bullet(""),
          h2("🗒 How it felt"), p(),
        ],
      ),
    ] },
  { key: "travel-plan", category: "Personal & Health", label: "Travel plan", description: "Plan a trip end to end", icon: "✈️",
    build: () => [
      h1("✈️ Travel plan"), p("📍 Destination: "), p("🗓 Dates: "), p("💰 Budget: "),
      callout("🌟", "What do I most want from this trip?"),
      divider(),
      columns(
        [
          h2("🗺 Itinerary"), h3("Day 1"), bullet(""), h3("Day 2"), bullet(""),
          h2("🍽 Places to try"), bullet(""),
        ],
        [
          h2("🧳 Packing list"), check(""), check(""),
          h2("📌 Bookings"), bullet("Flights — "), bullet("Stay — "),
        ],
      ),
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

/** A template's database definition, if it has one (server creates it). */
export function templateDatabase(key: string): TemplateDatabase | null {
  return BY_KEY.get(key)?.database?.() ?? null;
}

/** All databases a template embeds, keyed by their dbBlock() sentinel. Unifies
 * the single `database` (→ default sentinel) and multi `databases` forms. */
export function templateDatabases(key: string): Record<string, TemplateDatabase> {
  const t = BY_KEY.get(key);
  if (!t) return {};
  const out: Record<string, TemplateDatabase> = {};
  if (t.database) out[TEMPLATE_DB_SENTINEL] = t.database();
  if (t.databases) Object.assign(out, t.databases());
  return out;
}

/** A deterministic, representative gradient cover for a template card (Notion's
 * gallery shows a cover illustration per template; we derive a distinct two-hue
 * gradient from the key so each template has its own recognizable cover). */
export function templateCover(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 38) % 360;
  return `linear-gradient(135deg, hsl(${hue} 62% 64%), hsl(${hue2} 58% 52%))`;
}
