import OpenAI from "openai";
import type { IFieldDefinition } from "@/lib/models/section-template";

const DEDUP_THRESHOLD = 0.10;
const EMBEDDING_MODEL = "text-embedding-3-small";

export function computeDistance(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 1;
  return 1 - dot / denom;
}

export function isSignificantlyDifferent(a: number[], b: number[]): boolean {
  return computeDistance(a, b) > DEDUP_THRESHOLD;
}

export function templateToEmbeddingInput(
  name: string,
  description: string,
  fields: Pick<IFieldDefinition, "label" | "type">[]
): string {
  const fieldStr = fields.map((f) => `${f.label} (${f.type})`).join(", ");
  return `${name} — ${description}. Fields: ${fieldStr}`;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const client = new OpenAI({ apiKey });
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}
