import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { Mistral } from "@mistralai/mistralai";
import { z } from "zod/v4";
import type { IFieldDefinition, ISectionTemplate } from "@/lib/models/section-template";
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

/**
 * Build an augmented prompt that includes matched template context.
 * Strong match: fork and adapt. Weak match: use as inspiration. No match: generate fresh.
 */
export function buildAugmentedPrompt(
  userPrompt: string,
  template: MatchedTemplate | null,
  score: number
): string {
  if (!template || score < WEAK_MATCH_THRESHOLD) {
    return userPrompt;
  }

  const fieldsJson = JSON.stringify(template.fields, null, 2);

  if (score >= STRONG_MATCH_THRESHOLD) {
    return `Existing template found: "${template.name}"
Fields: ${fieldsJson}
ViewType: ${template.viewType}

Adapt this template for the user's specific needs: "${userPrompt}"
You may add, remove, or rename fields. Keep the general structure if it fits.`;
  }

  // Weak match — use as inspiration
  return `For inspiration, here is a somewhat related template: "${template.name}"
Fields: ${fieldsJson}
ViewType: ${template.viewType}

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
    viewType: z.enum(["weekly-cards", "table", "grid"]).default("weekly-cards"),
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["boolean", "number", "text", "select", "date"]),
      options: z.array(z.string()).optional(),
      formula: z.string().optional(),
    })),
    layoutHtml: z.string().optional(),
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
- fields: 3-8 fields. Think about what data points matter for this activity.
  * For reselling/trading: ALWAYS include purchasePrice, salePrice, and a profit field with formula
  * For computed fields, add "formula" property: e.g. "formula": "salePrice - purchasePrice"

Field types: boolean (yes/no toggle), number, text, select (with options array), date
Formula: optional string expression for auto-calculated fields (e.g. "salePrice - purchasePrice")

layoutHtml: REQUIRED for custom sections. Generate a Tailwind CSS HTML layout that renders beautifully in dark mode.
  Rules for layoutHtml:
  - Use {fieldName} syntax for data binding (e.g., {salePrice}, {itemName})
  - Use {fieldA - fieldB} for arithmetic (e.g., {salePrice - purchasePrice})
  - Use data-each="entries" attribute for looping: <div data-each="entries"><span>{entry.fieldName}</span></div>
  - Use Tailwind CSS classes (dark theme: bg-white/5, text-white, text-white/60, etc.)
  - Use rounded corners (rounded-xl, rounded-2xl), subtle borders (border border-white/10)
  - Make it visually unique and beautiful — each section should feel custom-designed
  - No <script> tags, no onclick/onevent attributes
  - Keep it concise — dashboard card style, not a full page

EXAMPLE layoutHtml for a tire reselling section:
<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3">
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <p class="text-xs text-emerald-400 mb-1">Revenue</p>
      <p class="text-2xl font-bold text-white">\${salePrice}</p>
    </div>
    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <p class="text-xs text-blue-400 mb-1">Profit</p>
      <p class="text-2xl font-bold text-white">\${salePrice - purchasePrice}</p>
    </div>
  </div>
  <div data-each="entries">
    <div class="flex items-center justify-between py-2 border-b border-white/5 text-sm">
      <span class="text-white">{entry.itemName}</span>
      <span class="text-emerald-400 font-medium">\${entry.salePrice}</span>
    </div>
  </div>
</div>
Note: The $ before expressions are visual currency symbols — the {…} part is what gets interpolated.

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

function extractJSON(text: string): string {
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

  const augmentedPrompt = buildAugmentedPrompt(
    prompt,
    bestMatch ? { name: bestMatch.name, fields: bestMatch.fields, viewType: bestMatch.viewType } : null,
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
        layoutHtml: section.layoutHtml || "",
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
