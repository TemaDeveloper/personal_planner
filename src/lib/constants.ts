export const COLOR_MODES = ["system", "light", "dark"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const THEMES = ["clay", "sage", "ocean", "amber", "plum"] as const;
export type AccentTheme = (typeof THEMES)[number];

export const FONTS = ["sans", "inter", "geometric", "serif", "mono"] as const;
export type FontStyle = (typeof FONTS)[number];

export const FONT_META: Record<FontStyle, { label: string; description: string; preview: string }> = {
  sans:      { label: "Hanken",        description: "Editorial & clean",    preview: "Aa" },
  inter:     { label: "Inter",         description: "Modern & neutral",     preview: "Aa" },
  geometric: { label: "Space Grotesk", description: "Bold & geometric",     preview: "Aa" },
  serif:     { label: "Playfair",      description: "Elegant & editorial",  preview: "Aa" },
  mono:      { label: "JetBrains",     description: "Code & technical",     preview: "Aa" },
};

export const LAYOUTS = ["compact", "default", "spacious"] as const;
export type LayoutDensity = (typeof LAYOUTS)[number];

export const CURRENCIES = ["CAD", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const WEEK_STARTS = ["monday", "sunday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export const DATE_FORMATS = ["MMM d, yyyy", "d MMM yyyy", "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ["24h", "12h"] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const EXPENSE_CATEGORIES = [
  "travel",
  "equipment",
  "meals",
  "office",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const BILL_CATEGORIES = [
  "rent",
  "utilities",
  "subscriptions",
  "insurance",
  "other",
] as const;

export const THEME_COLORS: Record<AccentTheme, string> = {
  clay: "#C0613C",
  sage: "#5E8C6A",
  ocean: "#3F6B8C",
  amber: "#B07D2B",
  plum: "#7A5C7E",
};

// No car is assumed by default. Users who drive set these in Settings.
export const DEFAULT_GAS_PRICE = 0; // cents per litre
export const DEFAULT_CAR_CONSUMPTION = 0; // L/100km

// Configurable sections
export const SECTIONS = [
  "work", "gym", "finances", "habits", "study",
  "hobbies", "housework", "health", "goals", "reading", "journal", "shopping", "mealprep",
] as const;
export type SectionId = (typeof SECTIONS)[number];
export const DEFAULT_ENABLED_SECTIONS: SectionId[] = ["work", "gym", "finances", "habits"];

export const SECTION_META: Record<SectionId, {
  label: string;
  icon: string;
  href: string;
  description: string;
  mobilePriority: number;
  mobileLabel: string;
}> = {
  work:      { label: "Work",      icon: "Briefcase",       href: "/sections/work",      description: "Track hours and earnings",     mobilePriority: 1,  mobileLabel: "Work" },
  gym:       { label: "Gym",       icon: "Dumbbell",        href: "/sections/gym",       description: "Daily attendance tracker",      mobilePriority: 2,  mobileLabel: "Gym" },
  finances:  { label: "Finances",  icon: "DollarSign",      href: "/sections/finances",  description: "Income & expenses",            mobilePriority: 3,  mobileLabel: "Money" },
  habits:    { label: "Habits",    icon: "Flame",           href: "/sections/habits",    description: "Daily habits & streaks",       mobilePriority: 4,  mobileLabel: "Habits" },
  study:     { label: "Study",     icon: "GraduationCap",   href: "/sections/study",     description: "Subjects, homework & grades",  mobilePriority: 5,  mobileLabel: "Study" },
  hobbies:   { label: "Hobbies",   icon: "Palette",         href: "/sections/hobbies",   description: "Track hobby time & projects",  mobilePriority: 6,  mobileLabel: "Hobbies" },
  housework: { label: "Housework", icon: "Home",            href: "/sections/housework", description: "Chores & recurring tasks",     mobilePriority: 7,  mobileLabel: "Chores" },
  health:    { label: "Health",    icon: "Heart",           href: "/sections/health",    description: "Water, sleep & wellness",      mobilePriority: 8,  mobileLabel: "Health" },
  goals:     { label: "Goals",     icon: "Target",          href: "/sections/goals",     description: "Goals & milestones",           mobilePriority: 9,  mobileLabel: "Goals" },
  reading:   { label: "Reading",   icon: "BookOpen",        href: "/sections/reading",   description: "Reading list & progress",      mobilePriority: 10, mobileLabel: "Books" },
  journal:   { label: "Journal",   icon: "NotebookPen",     href: "/sections/journal",   description: "Daily journal",               mobilePriority: 11, mobileLabel: "Journal" },
  shopping:  { label: "Shopping",  icon: "ShoppingCart",    href: "/sections/shopping",  description: "Shopping lists",               mobilePriority: 12, mobileLabel: "Shop" },
  mealprep:  { label: "Meal Prep", icon: "UtensilsCrossed", href: "/sections/mealprep",  description: "Weekly meal planning",         mobilePriority: 13, mobileLabel: "Meals" },
};

export const ACADEMIC_ITEM_TYPES = ["lab", "assignment", "test", "quiz"] as const;
export type AcademicItemType = (typeof ACADEMIC_ITEM_TYPES)[number];
