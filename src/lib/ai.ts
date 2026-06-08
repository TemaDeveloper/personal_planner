import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { Mistral } from "@mistralai/mistralai";
import { z } from "zod/v4";
import SectionTemplate, { type IFieldDefinition, type ISectionTemplate } from "@/lib/models/section-template";
import {
  generateEmbedding,
  searchSimilarTemplates,
  templateToEmbeddingInput,
  saveOrDedup,
  type TemplateSearchResult,
} from "@/lib/embeddings";

interface MatchedTemplate {
  name: string;
  fields: Pick<IFieldDefinition, "key" | "label" | "type" | "options" | "formula">[];
  viewType: string;
}

export const STRONG_MATCH_THRESHOLD = 0.85;
export const WEAK_MATCH_THRESHOLD = 0.70;

interface MatchedTemplateWithLayout extends MatchedTemplate {
  layoutHtml?: string;
}

/**
 * Build an augmented prompt that includes matched template context.
 * Weak match: use fields + layout as inspiration. No match: generate fresh.
 * Strong matches (≥0.85) are handled before this — they skip AI entirely.
 */
export function buildAugmentedPrompt(
  userPrompt: string,
  template: MatchedTemplateWithLayout | null,
  score: number
): string {
  if (!template || score < WEAK_MATCH_THRESHOLD) {
    return userPrompt;
  }

  const fieldsJson = JSON.stringify(template.fields, null, 2);

  // Weak match — use as inspiration, include layoutHtml so AI can adapt
  return `For inspiration, here is a somewhat related template: "${template.name}"
Fields: ${fieldsJson}
ViewType: ${template.viewType}
${template.layoutHtml ? `LayoutHtml: ${template.layoutHtml}` : ""}

Generate a section for: "${userPrompt}"
Use the above as inspiration but create what fits best for this specific use case.`;
}

import { type AIProvider } from "@/lib/ai-providers";
export type { AIProvider };

// Coerce strings to numbers (LLMs sometimes return "18" instead of 18)
const coerceNum = z.union([z.number(), z.string().transform(Number)]).pipe(z.number());

const PlannerConfigSchema = z.object({
  enabledSections: z.array(z.string()),
  workConfig: z.object({
    jobs: z.array(z.object({
      name: z.string(),
      hourlyRate: coerceNum.default(0),
      weeklyTarget: coerceNum.default(20),
    })),
  }).optional(),
  gymConfig: z.object({
    targetDaysPerWeek: coerceNum.pipe(z.number().min(1).max(7)),
  }).optional(),
  studyConfig: z.object({
    subjects: z.array(z.object({ name: z.string() })),
  }).optional(),
  hobbiesConfig: z.object({
    hobbies: z.array(z.object({ name: z.string() })),
  }).optional(),
  houseworkConfig: z.object({
    chores: z.array(z.object({
      name: z.string(),
      frequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
    })),
  }).optional(),
  bills: z.array(z.object({
    name: z.string(),
    amount: coerceNum.default(0),
    dueDay: coerceNum.pipe(z.number().min(1).max(31)).default(1),
    category: z.enum(["rent", "utilities", "subscriptions", "insurance", "other"]).default("other"),
  })).optional(),
  suggestedHabits: z.array(z.string()).optional(),
  customSections: z.array(z.object({
    name: z.string(),
    icon: z.string(),
    description: z.string(),
    viewType: z.enum(["weekly-cards", "table", "grid", "board", "calendar"]).default("weekly-cards"),
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["boolean", "number", "text", "select", "date"]),
      options: z.array(z.string()).optional(),
      formula: z.string().optional(),
    })),
    layoutHtml: z.string().default(""),
  })).optional(),
});

export type PlannerConfig = z.infer<typeof PlannerConfigSchema>;

const SYSTEM_PROMPT = `You are an expert planner designer. Your job is to deeply understand what the user wants to track, then create the PERFECT set of tracking sections with smart, detailed fields.

THINK DEEPLY about what the user actually needs. Don't just take their words literally — infer the underlying tracking needs. Ask yourself: "What would this person want to see at the end of the week/month?" Examples:
- "I resell monitors from Facebook Marketplace" → purchase cost, sale price, profit, which model, platform, sold status, daily count
- "I'm training for a marathon" → distance, time, pace, route, how I felt, weekly mileage total
- "I'm learning Japanese" → minutes studied, new vocab count, practice type (reading/writing/listening/speaking), resource used
- "I do Uber Eats on weekends" → hours online, deliveries completed, earnings, tips, gas spent, net profit
- "I take care of my elderly mother" → medications given, meals prepared, mood/energy, doctor appointments, notes
- "I'm building a SaaS" → feature worked on, hours spent, bugs fixed, users acquired, revenue, deployment status
- "I trade crypto" → coin, buy price, sell price, quantity, profit/loss, exchange, strategy notes
- "I grow tomatoes on my balcony" → watered, fertilized, new growth observed, harvested count, weather, photos notes

These are just examples. You can create sections for ANYTHING — the fields should always be tailored to the specific activity.

ABSOLUTE RULES:

1. NEVER add sections the user did not explicitly mention. Zero exceptions.
   - "I resell monitors on Facebook Marketplace" → create ONE custom "Monitor Reselling" section. That's it. Nothing else.
   - Do NOT add work, gym, habits, finances, health, study, or ANY other section unless the user specifically asked for it.
   - Do NOT create a separate "finances" or "Reselling Finance" section — put ALL money fields (purchase price, sale price, profit) INSIDE the main custom section.

2. Put ALL related fields in ONE custom section, not multiple sections.
   - WRONG: "Monitor Reselling" section + "Reselling Finance" section
   - RIGHT: "Monitor Reselling" section with purchase price, sale price, profit, platform, notes ALL in one section

3. ONLY use built-in sections when the user explicitly names that exact activity:
   - "gym" → only if user says "gym" or "workout"
   - "work" → only if user says "I work at [company]" with hourly wages
   - "habits" → only if user says "habits" or "daily habits"
   - If the user's activity is anything specific (reselling, trading, freelancing, etc.) → ALWAYS create a custom section, NEVER use built-in "work"

4. When in doubt, create FEWER sections, not more. One great custom section beats five generic ones.

BUILT-IN SECTIONS (only use when genuinely appropriate):
- work: ONLY for traditional hourly/salaried jobs with hours tracking and earnings
- gym: Daily gym attendance check (went or didn't)
- finances: General expenses and monthly bills
- habits: Simple daily yes/no habit tracking
- study: Academic subject-based study sessions
- hobbies: General hobby time tracking
- housework: Household chores
- health: Water, sleep, weight, mood
- goals: Goal milestones
- reading: Book tracking
- journal: Daily journal
- shopping: Shopping lists
- mealprep: Meal planning

CUSTOM SECTIONS — create these for anything specific or nuanced:
Each custom section needs:
- name: clear, specific display name
- icon: one of: PawPrint, Car, Baby, Bike, Coffee, Music, Camera, Plane, Clock, Leaf, Star, Wrench, Users, Globe, Zap, Calendar, Briefcase, DollarSign, Target, BookOpen
- description: one-line description
- viewType: pick the BEST UI for this section:
  * "table" — for item-based tracking (reselling, inventory, transactions, purchases). Shows entries as rows in a spreadsheet table. USE THIS for anything where each entry is a distinct item/transaction.
  * "grid" — for daily yes/no tracking (habits, attendance, daily check-ins). Shows a monthly calendar grid.
  * "weekly-cards" — for daily logs with mixed field types. Shows one card per day in a week view.
  * "board" — USE THIS when the user asks for a Kanban board, columns, "to do / in progress / done", task board, or any workflow with swimlane columns. REQUIRED fields for board: (1) a "select" field with key "status" whose options are the requested columns (default ["To Do","In Progress","Done"]), (2) a "select" field with key "priority" whose options are ["Low","Medium","High"], (3) a "text" field with key "title" for the task name. You may add extra fields (due date, notes, assignee) as needed. For board sections, set layoutHtml to "" (empty string) — the board UI renders its own columns automatically.
- fields: 3-8 fields. Think about what data points matter for this activity.
  * For reselling/trading: ALWAYS include purchasePrice, salePrice, and a profit field with formula
  * For computed fields, add "formula" property: e.g. "formula": "salePrice - purchasePrice"

Field types: boolean (yes/no toggle), number, text, select (with options array), date
Formula: optional string expression for auto-calculated fields (e.g. "salePrice - purchasePrice")

layoutHtml: REQUIRED for custom sections. Generate a Tailwind CSS HTML layout that renders beautifully in dark mode.

  First, classify each field you create into a ROLE, then pick the structure:
  - IDENTIFIER: text field naming each entry (item name, title, exercise) — show prominently as row/card label
  - KEY METRIC: number/formula fields showing outcomes (profit, total, score) — stat cards on top, bold
  - DETAIL: supporting numbers (cost, reps, quantity) — inline, secondary styling
  - STATUS: select/boolean fields (sold, completed) — badges or ✓/– indicators
  - NOTES: long text — truncated, muted, at bottom

  Pick structure based on field composition:
  - Has formula/key metrics + identifier + many fields per entry → stat cards on top + table rows (data-each)
  - All numbers, no identifier, single-entry → metric tiles in grid (no data-each)
  - Identifier + select/status + mixed fields → entry cards (data-each), name top-left, badge top-right
  - Mostly booleans + one identifier → compact checklist rows (data-each)
  - Identifier + few details, distinct items → item list or small cards (data-each)
  - Mix of everything → key metrics as stats on top, data-each list below, identifier as label

  Syntax rules:
  - {fieldName} for data binding, {fieldA - fieldB} for arithmetic
  - data-each="entries" for loops, {entry.fieldName} inside loops
  - Literal $ before {…} for currency: $\{salePrice}
  - Tailwind dark theme: bg-white/5, bg-emerald-500/10, bg-blue-500/10, bg-amber-500/10 etc.
  - Text: text-white, text-white/60 (secondary), text-emerald-400/blue-400/amber-400 (accents)
  - number fields → font-bold + unit ($, hrs, kg) based on label
  - boolean fields → ✓ or – indicator
  - select fields → rounded badge
  - formula fields → accent-colored and bold
  - NEVER use placeholder text ("Project A", "Item 1") — every value MUST use {fieldName} or {entry.fieldName}
  - No <script> tags, no onclick/onevent attributes

layoutHtml examples (ID=identifier, KM=key metric, DT=detail, ST=status, NT=notes):

  Reselling (ID=itemName, KM=salePrice+profit, DT=purchasePrice, ST=sold → stats+table):
<div class="space-y-3"><div class="grid grid-cols-3 gap-3"><div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><p class="text-xs text-emerald-400 mb-1">Revenue</p><p class="text-2xl font-bold text-white">\${salePrice}</p></div><div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p class="text-xs text-blue-400 mb-1">Cost</p><p class="text-2xl font-bold text-white">\${purchasePrice}</p></div><div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><p class="text-xs text-amber-400 mb-1">Profit</p><p class="text-2xl font-bold text-white">\${salePrice - purchasePrice}</p></div></div><div class="rounded-xl border border-white/10 overflow-hidden"><div class="grid grid-cols-4 gap-2 px-4 py-2 text-xs text-white/40 border-b border-white/10"><span>Item</span><span>Cost</span><span>Sold For</span><span>Status</span></div><div data-each="entries"><div class="grid grid-cols-4 gap-2 px-4 py-2.5 text-sm border-b border-white/5"><span class="text-white truncate">{entry.itemName}</span><span class="text-white/60">\${entry.purchasePrice}</span><span class="text-emerald-400 font-medium">\${entry.salePrice}</span><span class="text-xs">{entry.sold}</span></div></div></div></div>

  Health Log (all numbers, no ID → metric tiles):
<div class="grid grid-cols-2 gap-3"><div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p class="text-xs text-blue-400 mb-1">Water</p><p class="text-2xl font-bold text-white">{water}<span class="text-sm text-white/40 ml-1">glasses</span></p></div><div class="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"><p class="text-xs text-purple-400 mb-1">Sleep</p><p class="text-2xl font-bold text-white">{sleep}<span class="text-sm text-white/40 ml-1">hrs</span></p></div><div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><p class="text-xs text-amber-400 mb-1">Weight</p><p class="text-2xl font-bold text-white">{weight}<span class="text-sm text-white/40 ml-1">kg</span></p></div><div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><p class="text-xs text-emerald-400 mb-1">Mood</p><p class="text-2xl font-bold text-white">{mood}<span class="text-sm text-white/40 ml-1">/5</span></p></div></div>

  Books (ID=title, DT=author, ST=genre(select)+finished, KM=rating → item cards):
<div data-each="entries"><div class="p-3 rounded-xl bg-white/5 border border-white/10 mb-2"><div class="flex items-start justify-between gap-2"><div class="min-w-0 flex-1"><p class="text-white text-sm font-medium truncate">{entry.title}</p><p class="text-white/40 text-xs mt-0.5">{entry.author}</p></div><div class="flex items-center gap-2 flex-shrink-0"><span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-xs text-purple-400">{entry.genre}</span><span class="text-amber-400 font-bold text-sm">{entry.rating}<span class="text-white/30">/5</span></span></div></div></div></div>

  Projects (ID=projectName, ST=status(select), KM=hoursSpent+tasksCompleted, NT=notes → stats+entry cards):
<div class="space-y-3"><div class="grid grid-cols-2 gap-3"><div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p class="text-xs text-blue-400 mb-1">Hours Today</p><p class="text-2xl font-bold text-white">{hoursSpent}<span class="text-sm text-white/40 ml-1">hrs</span></p></div><div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><p class="text-xs text-emerald-400 mb-1">Tasks Done</p><p class="text-2xl font-bold text-white">{tasksCompleted}</p></div></div><div data-each="entries"><div class="p-3 rounded-xl bg-white/5 border border-white/10 mb-2"><div class="flex items-center justify-between mb-1"><span class="text-white font-medium text-sm">{entry.projectName}</span><span class="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">{entry.status}</span></div><div class="flex gap-4 text-xs text-white/40"><span>{entry.hoursSpent} hrs</span><span>{entry.tasksCompleted} tasks</span></div><p class="text-xs text-white/40 mt-1 truncate">{entry.notes}</p></div></div></div>

  Exercises (ID=exercise, DT=sets+reps+weight, no formulas → pure table):
<div class="rounded-xl border border-white/10 overflow-hidden"><div class="grid grid-cols-5 gap-2 px-4 py-2 text-xs text-white/40 border-b border-white/10"><span class="col-span-2">Exercise</span><span>Sets</span><span>Reps</span><span>Weight</span></div><div data-each="entries"><div class="grid grid-cols-5 gap-2 px-4 py-2.5 text-sm border-b border-white/5"><span class="text-white font-medium col-span-2 truncate">{entry.exercise}</span><span class="text-white/60">{entry.sets}</span><span class="text-white/60">{entry.reps}</span><span class="text-amber-400 font-medium">{entry.weight}<span class="text-white/30 text-xs ml-0.5">kg</span></span></div></div></div>

  Medications (ID=medName, ST=taken(boolean), DT=dosage+time → checklist):
<div class="rounded-xl border border-white/10 overflow-hidden"><div data-each="entries"><div class="flex items-center gap-3 px-4 py-3 border-b border-white/5"><span class="text-lg">{entry.taken}</span><div class="flex-1 min-w-0"><span class="text-white text-sm font-medium">{entry.medName}</span><span class="text-white/40 text-xs ml-2">{entry.dosage}</span></div><span class="text-white/40 text-xs">{entry.time}</span></div></div></div>

  Deliveries (KM=netProfit(formula)+earnings+tips, DT=deliveries+hoursOnline, no ID → stats+compact rows):
<div class="space-y-3"><div class="grid grid-cols-3 gap-3"><div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><p class="text-xs text-emerald-400 mb-1">Net Profit</p><p class="text-2xl font-bold text-white">\${earnings - gasSpent}</p></div><div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p class="text-xs text-blue-400 mb-1">Earnings</p><p class="text-2xl font-bold text-white">\${earnings}</p></div><div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><p class="text-xs text-amber-400 mb-1">Tips</p><p class="text-2xl font-bold text-white">\${tips}</p></div></div><div data-each="entries"><div class="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03] mb-1.5"><div class="flex gap-4 text-sm"><span class="text-white">{entry.deliveries} deliveries</span><span class="text-white/40">{entry.hoursOnline} hrs</span></div><span class="text-emerald-400 font-medium text-sm">\${entry.earnings}</span></div></div></div>

  Crypto (ID=coin, KM=profitLoss(formula), DT=buyPrice+sellPrice+quantity, ST=exchange(select) → stats+multi-col table):
<div class="space-y-3"><div class="grid grid-cols-2 gap-3"><div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><p class="text-xs text-emerald-400 mb-1">Sell Value</p><p class="text-2xl font-bold text-white">\${sellPrice}</p></div><div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><p class="text-xs text-amber-400 mb-1">P&L</p><p class="text-2xl font-bold text-white">\${sellPrice - buyPrice}</p></div></div><div class="rounded-xl border border-white/10 overflow-hidden"><div class="grid grid-cols-5 gap-2 px-4 py-2 text-xs text-white/40 border-b border-white/10"><span>Coin</span><span>Buy</span><span>Sell</span><span>Qty</span><span>Exchange</span></div><div data-each="entries"><div class="grid grid-cols-5 gap-2 px-4 py-2.5 text-sm border-b border-white/5"><span class="text-white font-medium">{entry.coin}</span><span class="text-white/60">\${entry.buyPrice}</span><span class="text-emerald-400">\${entry.sellPrice}</span><span class="text-white/60">{entry.quantity}</span><span class="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">{entry.exchange}</span></div></div></div></div>

  Study (ID=subject, KM=duration+vocabCount, ST=type(select) → stats+session list):
<div class="space-y-3"><div class="grid grid-cols-2 gap-3"><div class="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"><p class="text-xs text-purple-400 mb-1">Study Time</p><p class="text-2xl font-bold text-white">{duration}<span class="text-sm text-white/40 ml-1">min</span></p></div><div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p class="text-xs text-blue-400 mb-1">New Vocab</p><p class="text-2xl font-bold text-white">{vocabCount}</p></div></div><div class="rounded-xl border border-white/10 overflow-hidden"><div data-each="entries"><div class="flex items-center gap-3 px-4 py-2.5 border-b border-white/5"><span class="text-white text-sm font-medium flex-shrink-0">{entry.subject}</span><span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-xs text-purple-400">{entry.type}</span><span class="text-white/40 text-xs ml-auto flex-shrink-0">{entry.duration} min</span></div></div></div></div>

  Plants (ID=plantName, 3xST(boolean), NT=notes → compact checklist with boolean group):
<div data-each="entries"><div class="flex items-center gap-3 py-2.5 border-b border-white/5"><div class="flex gap-1.5"><span class="text-blue-400 text-sm">{entry.watered}</span><span class="text-amber-400 text-sm">{entry.fertilized}</span><span class="text-emerald-400 text-sm">{entry.newGrowth}</span></div><span class="text-white text-sm font-medium">{entry.plantName}</span><span class="text-white/40 text-xs ml-auto truncate max-w-[40%]">{entry.notes}</span></div></div>

  Note: $ before {…} = visual currency symbol. The {…} is what gets interpolated.

Return ONLY valid JSON (no markdown, no code fences).

EXAMPLE 1 — user says "I resell tires on Facebook Marketplace":
{
  "enabledSections": [],
  "customSections": [
    {
      "name": "Tire Reselling",
      "icon": "DollarSign",
      "description": "Track tire purchases, sales, and profit",
      "viewType": "table",
      "fields": [
        { "key": "itemName", "label": "Tire Model/Size", "type": "text" },
        { "key": "purchasePrice", "label": "Purchase Price ($)", "type": "number" },
        { "key": "salePrice", "label": "Sale Price ($)", "type": "number" },
        { "key": "profit", "label": "Profit ($)", "type": "number", "formula": "salePrice - purchasePrice" },
        { "key": "sold", "label": "Sold", "type": "boolean" },
        { "key": "buyer", "label": "Buyer", "type": "text" },
        { "key": "notes", "label": "Notes", "type": "text" }
      ],
      "layoutHtml": "<div class=\"space-y-3\"><div class=\"grid grid-cols-2 gap-3\"><div class=\"p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20\"><p class=\"text-xs text-emerald-400 mb-1\">Revenue</p><p class=\"text-2xl font-bold text-white\">\${salePrice}</p></div><div class=\"p-4 rounded-xl bg-blue-500/10 border border-blue-500/20\"><p class=\"text-xs text-blue-400 mb-1\">Profit</p><p class=\"text-2xl font-bold text-white\">\${salePrice - purchasePrice}</p></div></div><div data-each=\"entries\"><div class=\"flex items-center justify-between py-2 border-b border-white/5 text-sm\"><span class=\"text-white\">{entry.itemName}</span><span class=\"text-emerald-400 font-medium\">\${entry.salePrice}</span></div></div></div>"
    }
  ]
}
Notice: enabledSections is EMPTY because the user only asked about reselling, not gym/work/habits.

EXAMPLE 2 — user says "I work at Starbucks and go to the gym":
{
  "enabledSections": ["work", "gym"],
  "workConfig": { "jobs": [{ "name": "Starbucks", "hourlyRate": 17, "weeklyTarget": 20 }] },
  "gymConfig": { "targetDaysPerWeek": 5 }
}

Include config objects ONLY for sections in enabledSections. All numeric values must be numbers, not strings.`;

/**
 * Generic AI call function.
 * Takes a provider, API key, system prompt, and user message.
 * Returns the raw text response from the AI.
 */
export async function callAI(
  provider: AIProvider,
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  switch (provider) {
    case "claude": {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text || "";
    }
    case "gemini": {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `${systemPrompt}\n\n${userMessage}`,
      });
      return response.text || "";
    }
    case "mistral": {
      const client = new Mistral({ apiKey });
      const response = await client.chat.complete({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        maxTokens: 4096,
      });
      const choice = response.choices?.[0];
      if (choice && "message" in choice && choice.message) {
        return (choice.message.content as string) || "";
      }
      return "";
    }
    case "openai": {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 4096,
      });
      return response.choices[0]?.message?.content || "";
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1) {
    return text.slice(braceStart, braceEnd + 1);
  }
  return text;
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${SYSTEM_PROMPT}\n\nUser's description: ${prompt}`,
  });
  return response.text || "";
}

async function callMistral(prompt: string, apiKey: string): Promise<string> {
  const client = new Mistral({ apiKey });
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    maxTokens: 2048,
  });
  const choice = response.choices?.[0];
  if (choice && "message" in choice && choice.message) {
    return (choice.message.content as string) || "";
  }
  return "";
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: 2048,
  });
  return response.choices[0]?.message?.content || "";
}

export async function generatePlannerConfig(
  prompt: string,
  provider: AIProvider,
  apiKey: string
): Promise<PlannerConfig> {
  let raw: string;

  switch (provider) {
    case "claude":
      raw = await callClaude(prompt, apiKey);
      break;
    case "gemini":
      raw = await callGemini(prompt, apiKey);
      break;
    case "openai":
      raw = await callOpenAI(prompt, apiKey);
      break;
    case "mistral":
      raw = await callMistral(prompt, apiKey);
      break;
  }

  const jsonStr = extractJSON(raw);
  const parsed = JSON.parse(jsonStr);
  return PlannerConfigSchema.parse(parsed);
}

export async function generateWithDefaultAI(prompt: string): Promise<PlannerConfig> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY not configured");
  }
  return generatePlannerConfig(prompt, "mistral", apiKey);
}

/** Free-form single-shot completion using the default (Mistral) provider — returns raw text. */
export async function rawCompletion(prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");
  return callAI("mistral", apiKey, "You are a precise JSON-only assistant for a personal planner. Reply with JSON only.", prompt);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface PipelineResult {
  config: PlannerConfig;
  sourceTemplate: TemplateSearchResult | null;
  saveResult: { action: "created" | "reused"; templateId: string };
}

export async function generateWithTemplateSearch(
  prompt: string,
  userId: string
): Promise<PipelineResult> {
  let promptEmbedding: number[] | null = null;
  let searchResults: TemplateSearchResult[] = [];

  try {
    promptEmbedding = await generateEmbedding(prompt);
    searchResults = await searchSimilarTemplates(promptEmbedding);
  } catch {
    console.warn("[generate] Embedding search failed, generating from scratch");
  }

  const bestMatch = searchResults.length > 0 ? searchResults[0] : null;
  const bestScore = bestMatch?.score ?? 0;

  // Strong match (≥0.85): skip AI call entirely, reuse the proven template
  if (bestMatch && bestScore >= STRONG_MATCH_THRESHOLD && bestMatch.layoutHtml) {
    await SectionTemplate.findByIdAndUpdate(bestMatch._id, {
      $inc: { usageCount: 1 },
    });

    const reusedConfig: PlannerConfig = {
      enabledSections: [],
      customSections: [{
        name: bestMatch.name,
        icon: bestMatch.icon,
        description: bestMatch.description,
        viewType: bestMatch.viewType,
        fields: bestMatch.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          ...(f.options ? { options: f.options } : {}),
          ...(f.formula ? { formula: f.formula } : {}),
        })),
        layoutHtml: bestMatch.layoutHtml,
      }],
    };

    return {
      config: reusedConfig,
      sourceTemplate: bestMatch,
      saveResult: { action: "reused", templateId: bestMatch._id },
    };
  }

  // Weak match or no match: generate via AI
  const augmentedPrompt = buildAugmentedPrompt(
    prompt,
    bestMatch ? {
      name: bestMatch.name,
      fields: bestMatch.fields,
      viewType: bestMatch.viewType,
      layoutHtml: bestMatch.layoutHtml,
    } : null,
    bestScore
  );

  const config = await generateWithDefaultAI(augmentedPrompt);

  let saveResult: { action: "created" | "reused"; templateId: string } = { action: "created", templateId: "" };

  if (config.customSections && config.customSections.length > 0) {
    const section = config.customSections[0];
    const embeddingInput = templateToEmbeddingInput(
      section.name,
      section.description,
      section.fields
    );

    let outputEmbedding: number[];
    try {
      outputEmbedding = await generateEmbedding(embeddingInput);
    } catch {
      outputEmbedding = promptEmbedding ?? [];
    }

    saveResult = await saveOrDedup(
      {
        name: section.name,
        slug: slugify(section.name),
        icon: section.icon,
        description: section.description,
        fields: section.fields as ISectionTemplate["fields"],
        viewType: section.viewType,
        layoutHtml: section.layoutHtml,
        embedding: outputEmbedding,
        sourcePrompt: prompt,
        createdBy: userId,
      },
      bestMatch && bestScore >= WEAK_MATCH_THRESHOLD
        ? { _id: bestMatch._id, embedding: bestMatch.embedding }
        : null
    );
  }

  return { config, sourceTemplate: bestMatch, saveResult };
}
