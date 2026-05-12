import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod/v4";

export type AIProvider = "claude" | "gemini" | "openai";

export const AI_PROVIDERS: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: "claude", label: "Claude", placeholder: "sk-ant-..." },
  { id: "gemini", label: "Gemini", placeholder: "AIza..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
];

const PlannerConfigSchema = z.object({
  enabledSections: z.array(z.string()),
  workConfig: z.object({
    jobs: z.array(z.object({
      name: z.string(),
      hourlyRate: z.number().default(0),
      weeklyTarget: z.number().default(20),
    })),
  }).optional(),
  gymConfig: z.object({
    targetDaysPerWeek: z.number().min(1).max(7),
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
    amount: z.number().default(0),
    dueDay: z.number().min(1).max(31).default(1),
    category: z.enum(["rent", "utilities", "subscriptions", "insurance", "other"]).default("other"),
  })).optional(),
  suggestedHabits: z.array(z.string()).optional(),
});

export type PlannerConfig = z.infer<typeof PlannerConfigSchema>;

const SYSTEM_PROMPT = `You are configuring a personal planner app. Based on the user's description, select which sections to enable and pre-configure them with sensible defaults.

Available sections (use these exact IDs):
- work: Track work hours and earnings across multiple jobs
- gym: Daily gym attendance tracker
- finances: Income, expenses, and monthly bills
- habits: Daily habit tracking with streaks
- study: Subject-based study sessions, homework, and grades
- hobbies: Hobby projects and time tracking
- housework: Chore tracking with recurring tasks
- health: Water intake, sleep, weight, and mood
- goals: Goal setting with milestones
- reading: Book tracking with progress
- journal: Daily journal entries
- shopping: Shopping lists
- mealprep: Weekly meal planning

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "enabledSections": ["work", "gym", ...],
  "workConfig": { "jobs": [{ "name": "Job Name", "hourlyRate": 18, "weeklyTarget": 20 }] },
  "gymConfig": { "targetDaysPerWeek": 5 },
  "studyConfig": { "subjects": [{ "name": "Subject" }] },
  "hobbiesConfig": { "hobbies": [{ "name": "Hobby" }] },
  "houseworkConfig": { "chores": [{ "name": "Chore", "frequency": "daily" }] },
  "bills": [{ "name": "Rent", "amount": 1200, "dueDay": 1, "category": "rent" }],
  "suggestedHabits": ["Habit name"]
}

Only include config objects for sections that are in enabledSections. Use reasonable defaults when the user doesn't specify exact values. If unsure about a section, include it — the user can toggle it off.`;

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
    max_tokens: 1024,
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

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: 1024,
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
  }

  const jsonStr = extractJSON(raw);
  const parsed = JSON.parse(jsonStr);
  return PlannerConfigSchema.parse(parsed);
}
