/**
 * Bespoke, pure transforms from each legacy built-in model to CustomEntry rows
 * matching the seed template field keys. Handles nested arrays (shopping items,
 * meal-plan meals), joins (habit logs → habit name), and multi-source sections
 * (study, hobbies). Each output row carries a stable `srcKey` for idempotency.
 */

export type LegacyRow = Record<string, unknown> & { _id?: unknown };

export interface OutRow {
  srcKey: string;
  date: string;
  data: Record<string, unknown>;
}

const DOW: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function rid(d: LegacyRow): string {
  return String(d._id ?? "");
}

function iso(v: unknown, now: Date): string {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return now.toISOString();
}

function isoOrUndef(v: unknown): string | undefined {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

/** Drop null/undefined/"" so we never write empty fields. `false` and `0` stay. */
function clean(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export const transformWork = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({
    srcKey: rid(r),
    date: iso(r.date, now),
    data: clean({ job: r.jobName, hours: r.hours, note: r.note }),
  }));

export const transformGym = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({ srcKey: rid(r), date: iso(r.date, now), data: { attended: true } }));

export const transformFinances = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({
    srcKey: rid(r),
    date: iso(r.date, now),
    data: clean({
      description: r.description,
      amount: r.amount,
      type: "expense",
      category: r.category,
      reimbursed: r.reimbursed,
    }),
  }));

export const transformHabits = (
  logs: LegacyRow[],
  names: Map<string, string>,
  now: Date
): OutRow[] =>
  logs.map((l) => ({
    srcKey: rid(l),
    date: iso(l.date, now),
    data: clean({ habit: names.get(String(l.habitId)), done: true }),
  }));

export const transformStudy = (
  src: { academic: LegacyRow[]; sessions: LegacyRow[]; homework: LegacyRow[] },
  now: Date
): OutRow[] => [
  ...src.academic.map((a) => ({
    srcKey: `ai:${rid(a)}`,
    date: iso(a.dueDate, now),
    data: clean({
      subject: a.subject,
      item_type: a.type,
      title: a.title,
      grade: a.grade,
      completed: a.completed,
    }),
  })),
  ...src.sessions.map((s) => ({
    srcKey: `ss:${rid(s)}`,
    date: iso(s.date, now),
    data: clean({ subject: s.subject, item_type: "session", minutes: s.minutes, title: s.note }),
  })),
  ...src.homework.map((h) => ({
    srcKey: `hw:${rid(h)}`,
    date: iso(h.dueDate, now),
    data: clean({ subject: h.subject, item_type: "assignment", title: h.title, completed: h.completed }),
  })),
];

export const transformHobbies = (
  src: { sessions: LegacyRow[]; projects: LegacyRow[] },
  now: Date
): OutRow[] => [
  ...src.sessions.map((s) => ({
    srcKey: `hs:${rid(s)}`,
    date: iso(s.date, now),
    data: clean({ hobby: s.hobby, minutes: s.minutes, note: s.note }),
  })),
  ...src.projects.map((p) => ({
    srcKey: `hp:${rid(p)}`,
    date: iso(p.startDate, now),
    data: clean({ hobby: p.hobby, project: p.name, status: p.status, note: p.description }),
  })),
];

export const transformHousework = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({
    srcKey: rid(r),
    date: iso(r.date, now),
    data: clean({
      chore: r.choreName,
      done: r.completed,
      frequency: r.isRecurring ? "weekly" : "daily",
    }),
  }));

export const transformHealth = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({
    srcKey: rid(r),
    date: iso(r.date, now),
    data: clean({ water: r.water, sleep_hours: r.sleepHours, weight: r.weight, mood: r.mood }),
  }));

export const transformGoals = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({
    srcKey: rid(r),
    date: iso(r.targetDate ?? r.createdAt, now),
    data: clean({
      goal: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      target_date: isoOrUndef(r.targetDate),
    }),
  }));

export const transformReading = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({
    srcKey: rid(r),
    date: iso(r.createdAt, now),
    data: clean({
      title: r.title,
      author: r.author,
      current_page: r.currentPage,
      total_pages: r.totalPages,
      status: r.status,
      rating: r.rating,
      notes: r.notes,
    }),
  }));

export const transformJournal = (rows: LegacyRow[], now: Date): OutRow[] =>
  rows.map((r) => ({
    srcKey: rid(r),
    date: iso(r.date, now),
    data: clean({ entry: r.content, mood: r.mood }),
  }));

export const transformShopping = (lists: LegacyRow[], now: Date): OutRow[] => {
  const out: OutRow[] = [];
  for (const list of lists) {
    const items = Array.isArray(list.items) ? (list.items as Record<string, unknown>[]) : [];
    items.forEach((item, i) => {
      out.push({
        srcKey: `${rid(list)}:${i}`,
        date: iso(list.createdAt, now),
        data: clean({
          item: item.name,
          qty: item.quantity,
          bought: item.checked,
          list: list.name,
        }),
      });
    });
  }
  return out;
};

export const transformMealprep = (plans: LegacyRow[], now: Date): OutRow[] => {
  const out: OutRow[] = [];
  for (const plan of plans) {
    const meals = Array.isArray(plan.meals) ? (plan.meals as Record<string, unknown>[]) : [];
    meals.forEach((m, i) => {
      out.push({
        srcKey: `${rid(plan)}:${i}`,
        date: iso(plan.date, now),
        data: clean({
          meal: m.name,
          day: DOW[Number(plan.dayOfWeek)] ?? undefined,
          type: m.type,
          notes: m.notes,
        }),
      });
    });
  }
  return out;
};
