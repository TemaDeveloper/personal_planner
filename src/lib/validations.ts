import { z } from "zod";

// -- Helpers --
export const safeString = z.string().max(500);
export const safeId = z.string().min(1).max(100);

// -- Auth --
export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(200),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

// -- Habits --
export const createHabitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  emoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
});

export const toggleHabitLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
});

// -- Journal --
export const createJournalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  content: z.string().min(1, "Content is required").max(10000),
  mood: z.number().int().min(1).max(5).optional(),
});

// -- Goals --
const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  completed: z.boolean().optional(),
});

export const createGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  targetDate: z.string().optional(),
  category: z.enum(["personal", "career", "health", "financial"]).optional(),
  milestones: z.array(milestoneSchema).max(50).optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  targetDate: z.string().nullable().optional(),
  category: z.enum(["personal", "career", "health", "financial"]).optional(),
  milestones: z.array(milestoneSchema).max(50).optional(),
});

// -- Health --
export const createHealthSchema = z.object({
  date: z.string().min(1, "Date is required"),
  water: z.number().min(0).max(20).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  weight: z.number().min(0).max(1000).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

// -- Reading --
export const createBookSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  author: z.string().max(200).optional(),
  totalPages: z.number().int().min(0).max(50000).optional(),
  currentPage: z.number().int().min(0).max(50000).optional(),
  status: z.enum(["reading", "completed", "want-to-read"]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
});

// -- Shopping --
const shoppingItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().min(0).max(10000).optional(),
  price: z.number().min(0).max(1000000).optional(),
  checked: z.boolean().optional(),
});

export const createShoppingSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  items: z.array(shoppingItemSchema).max(200).optional(),
});

// -- Housework --
export const createHouseworkSchema = z.object({
  date: z.string().min(1, "Date is required"),
  choreName: z.string().min(1, "Task is required").max(200),
  completed: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
});

// -- Meal Prep --
const mealSchema = z.object({
  type: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
});

export const createMealPlanSchema = z.object({
  date: z.string().min(1, "Date is required"),
  dayOfWeek: z.number().int().min(1).max(7),
  meals: z.array(mealSchema).max(20).optional(),
});

// -- Expenses --
export const createExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.number().min(0, "Amount must be positive").max(10000000),
  currency: z.string().max(10).optional(),
  description: z.string().min(1, "Description is required").max(500),
  category: z.string().max(100).optional(),
  jobName: z.string().max(100).optional(),
  reimbursable: z.boolean().optional(),
});

// -- Routes --
export const createRouteSchema = z.object({
  date: z.string().min(1, "Date is required"),
  origin: z.string().min(1, "Origin is required").max(200),
  destination: z.string().min(1, "Destination is required").max(200),
  distanceKm: z.number().min(0).max(100000),
  note: z.string().max(500).optional(),
});

// -- Work Sessions --
export const createWorkSessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z.number().min(0).max(24),
  jobName: z.string().min(1, "Job name is required").max(100),
  note: z.string().max(1000).optional(),
});

// -- Gym --
export const createWorkoutSchema = z.object({
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(1000).optional(),
});

// -- Study --
export const createStudySessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  subject: z.string().min(1, "Subject is required").max(100),
  minutes: z.number().int().min(1).max(1440),
  note: z.string().max(1000).optional(),
});

export const createHomeworkSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100),
  title: z.string().min(1, "Title is required").max(300),
  dueDate: z.string().optional(),
  completed: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const createAcademicSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100),
  type: z.enum(["test", "quiz", "assignment", "lab"]),
  title: z.string().min(1, "Title is required").max(300),
  dueDate: z.string().min(1, "Due date is required"),
  grade: z.number().min(0).max(100).optional(),
  note: z.string().max(2000).optional(),
});

// -- Hobbies --
export const createHobbySessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hobby: z.string().min(1, "Hobby is required").max(100),
  minutes: z.number().int().min(1).max(1440),
  note: z.string().max(1000).optional(),
  projectId: z.string().max(100).optional(),
});

export const createHobbyProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  hobby: z.string().min(1, "Hobby is required").max(100),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
});

// -- Custom Sections --
export const createCustomEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  data: z.record(z.string(), z.unknown()).optional(),
});

// -- Query Params --
export const dateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional(),
});

export const statusCategoryQuery = z.object({
  status: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
});

// -- AI Section Update --
export const fieldDefSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/i, "key must be alphanumeric/underscore"),
  label: z.string().min(1).max(60),
  type: z.enum(["boolean", "number", "text", "select", "date"]),
  options: z.array(z.string().max(40)).max(20).optional(),
  required: z.boolean().optional(),
  formula: z.string().max(200).optional(),
});

export const aiUpdateRequestSchema = z.object({
  sectionKey: z.string().min(1).max(80),
  prompt: z.string().min(3, "Describe the change").max(2000),
});

export const extraFieldsUpdateSchema = z
  .object({
    extraFields: z.array(fieldDefSchema).max(20).optional(),
    unsupported: z.boolean().optional(),
    message: z.string().max(300).optional(),
  })
  .refine((d) => d.unsupported === true || Array.isArray(d.extraFields), {
    message: "must include extraFields or set unsupported",
  });

export const dashboardMetricSchema = z.object({
  label: z.string().min(1).max(40),
  sectionKey: z.string().min(1).max(80),
  fieldKey: z.string().min(1).max(60),
  sourceKind: z.enum(["builtin", "custom-field"]),
  aggregation: z.enum(["sum", "avg", "latest", "count"]),
  period: z.enum(["week", "month"]).default("week"),
});

export const dashboardMetricsUpdateSchema = z.object({
  metrics: z.array(dashboardMetricSchema).max(12),
});

export const singleSectionUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(40).default("Star"),
  description: z.string().max(200).default(""),
  viewType: z.enum(["weekly-cards", "table", "grid", "board", "calendar"]).default("weekly-cards"),
  fields: z.array(fieldDefSchema).max(30),
  layoutHtml: z.string().default(""),
});

// -- Calendar --
export const calendarCategorySchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/i, "key must be alphanumeric/underscore"),
  label: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "color must be a hex value"),
});

export const calendarCategoriesUpdateSchema = z.object({
  calendarCategories: z.array(calendarCategorySchema).min(1).max(20),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  start: z.string().min(1, "Start is required"),
  end: z.string().min(1, "End is required"),
  allDay: z.boolean().optional(),
  categoryKey: z.string().min(1, "Category is required").max(40),
  description: z.string().max(2000).optional(),
});

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

type ValidatedEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  categoryKey: string;
  description: string;
};

/** Business-rule validation beyond shape: dates parse, end > start (timed), known category. */
export function validateCalendarEvent(
  input: unknown,
  categories: { key: string }[]
): { ok: true; value: ValidatedEvent } | { ok: false; error: string } {
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid event" };
  }
  const { title, start, end, categoryKey } = parsed.data;
  const allDay = parsed.data.allDay ?? false;
  const description = parsed.data.description ?? "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "Invalid date" };
  }
  if (!allDay && endDate.getTime() <= startDate.getTime()) {
    return { ok: false, error: "End must be after start" };
  }
  if (allDay && endDate.getTime() < startDate.getTime()) {
    return { ok: false, error: "End must not be before start" };
  }
  if (!categories.some((c) => c.key === categoryKey)) {
    return { ok: false, error: "Unknown category" };
  }
  return { ok: true, value: { title, start: startDate, end: endDate, allDay, categoryKey, description } };
}

// -- Notes (Notion-style pages) --
export const notesPageCreateSchema = z.object({
  parentId: z.string().min(1).max(100).nullable().optional(),
  title: z.string().max(200).optional(),
  template: z.string().max(60).optional(),
});

export const notesPageUpdateSchema = z
  .object({
    title: z.string().max(200).optional(),
    icon: z.string().max(16).optional(),
    content: z.array(z.unknown()).max(5000).optional(),
    parentId: z.string().min(1).max(100).nullable().optional(),
    order: z.number().optional(),
    coverUrl: z.string().max(1000).nullable().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "no fields to update" });
