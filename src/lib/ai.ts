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

const SYSTEM_PROMPT = `You are configuring a personal planner app. Parse the user's description carefully and extract EVERY detail they mention. Do NOT skip anything.

CRITICAL RULES:
- If the user mentions multiple jobs, include ALL of them in workConfig.jobs
- If the user mentions subjects or courses, include ALL of them in studyConfig.subjects
- If the user mentions hobbies, include ALL of them
- Capture every number they mention (hourly rates, hours/week, gym days, etc.)
- When in doubt, INCLUDE the section rather than skip it

Available sections (use these exact string IDs):
- work: Track work hours and earnings. Supports MULTIPLE jobs.
- gym: Daily gym attendance tracker with configurable days/week target.
- finances: Income, expenses, and monthly bills.
- habits: Daily habit tracking with streaks.
- study: Subject-based study sessions. Supports MULTIPLE subjects.
- hobbies: Hobby projects and time tracking. Supports MULTIPLE hobbies.
- housework: Chore tracking with recurring tasks.
- health: Water intake, sleep, weight, and mood.
- goals: Goal setting with milestones.
- reading: Book tracking with progress.
- journal: Daily journal entries.
- shopping: Shopping lists.
- mealprep: Weekly meal planning.

Return ONLY valid JSON (no markdown, no code fences, no explanation). Schema:
{
  "enabledSections": ["work", "gym", "study", ...],
  "workConfig": { "jobs": [{ "name": "Job 1", "hourlyRate": 18, "weeklyTarget": 20 }, { "name": "Job 2", "hourlyRate": 16, "weeklyTarget": 15 }] },
  "gymConfig": { "targetDaysPerWeek": 5 },
  "studyConfig": { "subjects": [{ "name": "Math" }, { "name": "CS" }] },
  "hobbiesConfig": { "hobbies": [{ "name": "Guitar" }, { "name": "Drawing" }] },
  "houseworkConfig": { "chores": [{ "name": "Vacuum", "frequency": "weekly" }] },
  "bills": [{ "name": "Rent", "amount": 1200, "dueDay": 1, "category": "rent" }],
  "suggestedHabits": ["Meditate", "Read 30 min"]
}

Include config objects ONLY for sections listed in enabledSections.

CUSTOM SECTIONS: If the user describes tracking needs that DON'T fit any of the 13 built-in sections above, create custom section templates in the "customSections" array. Each needs:
- name: display name (e.g., "Pet Care", "Meditation", "Side Projects")
- icon: one of: PawPrint, Car, Baby, Bike, Coffee, Music, Camera, Plane, Clock, Leaf, Star, Wrench, Users, Globe, Zap, Calendar
- description: short description
- fields: array of field definitions with key (camelCase), label, type (boolean/number/text/select/date), and options (for select type only)

Example custom section:
{ "name": "Pet Care", "icon": "PawPrint", "description": "Track pet feeding and walks", "fields": [{ "key": "fed", "label": "Fed", "type": "boolean" }, { "key": "walked", "label": "Walked", "type": "boolean" }, { "key": "notes", "label": "Notes", "type": "text" }] }`;

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
