import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { Mistral } from "@mistralai/mistralai";
import { z } from "zod/v4";

export type AIProvider = "claude" | "gemini" | "openai" | "mistral";

export const AI_PROVIDERS: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: "mistral", label: "Mistral", placeholder: "your-mistral-key" },
  { id: "claude", label: "Claude", placeholder: "sk-ant-..." },
  { id: "gemini", label: "Gemini", placeholder: "AIza..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
];

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
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["boolean", "number", "text", "select", "date"]),
      options: z.array(z.string()).optional(),
    })),
  })).optional(),
});

export type PlannerConfig = z.infer<typeof PlannerConfigSchema>;

const SYSTEM_PROMPT = `You are an expert planner designer. Your job is to deeply understand what the user wants to track, then create the PERFECT set of tracking sections with smart, detailed fields.

THINK DEEPLY about what the user actually needs. Don't just take their words literally — infer the underlying tracking needs. For example:
- "I resell monitors from Facebook Marketplace" → they need: purchase cost per item, sale price, profit calculation, which item was sold, daily sales count, inventory tracking
- "I'm training for a marathon" → they need: distance ran, time, pace, rest days, weekly mileage, race countdown
- "I'm learning Japanese" → they need: study time, vocabulary count, kanji learned, practice type (reading/writing/listening)

CRITICAL: PREFER CUSTOM SECTIONS over built-in sections. Only use built-in sections when they are a genuinely perfect fit (e.g. "gym" for gym attendance, "habits" for daily habits). If the user's activity is specific or nuanced, create a CUSTOM SECTION with tailored fields instead of shoehorning it into a generic built-in.

For example: "I work at Starbucks" → use built-in "work" section. But "I resell monitors" → create a CUSTOM "Monitor Reselling" section with specific fields like purchase price, sale price, profit, buyer, platform, etc. Do NOT use the generic "work" section for this.

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
- fields: 3-8 fields that capture what the user would actually want to log daily. Think about:
  * What data points matter for this activity?
  * What would help them see trends over time?
  * What's optional vs required?
  * Include both quantitative (numbers) and qualitative (text, select) fields

Field types: boolean (yes/no toggle), number, text, select (with options array), date

Return ONLY valid JSON (no markdown, no code fences). Schema:
{
  "enabledSections": ["gym", "habits", ...],
  "gymConfig": { "targetDaysPerWeek": 5 },
  "workConfig": { "jobs": [{ "name": "Job Name", "hourlyRate": 18, "weeklyTarget": 20 }] },
  "studyConfig": { "subjects": [{ "name": "Subject" }] },
  "hobbiesConfig": { "hobbies": [{ "name": "Hobby" }] },
  "houseworkConfig": { "chores": [{ "name": "Chore", "frequency": "daily" }] },
  "bills": [{ "name": "Rent", "amount": 1200, "dueDay": 1, "category": "rent" }],
  "suggestedHabits": ["Habit name"],
  "customSections": [
    {
      "name": "Monitor Reselling",
      "icon": "DollarSign",
      "description": "Track monitor purchases, sales, and profit",
      "fields": [
        { "key": "itemName", "label": "Monitor Model", "type": "text" },
        { "key": "purchasePrice", "label": "Purchase Price ($)", "type": "number" },
        { "key": "salePrice", "label": "Sale Price ($)", "type": "number" },
        { "key": "sold", "label": "Sold", "type": "boolean" },
        { "key": "platform", "label": "Platform", "type": "select", "options": ["Facebook Marketplace", "Craigslist", "eBay", "Other"] },
        { "key": "notes", "label": "Notes", "type": "text" }
      ]
    }
  ]
}

Include config objects ONLY for sections in enabledSections. All numeric values must be numbers, not strings.`;

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
