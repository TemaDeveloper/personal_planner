import OpenAI from "openai";
import SectionTemplate, { type ISectionTemplate, type IFieldDefinition } from "@/lib/models/section-template";

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

export interface TemplateSearchResult {
  _id: string;
  name: string;
  description: string;
  fields: ISectionTemplate["fields"];
  viewType: ISectionTemplate["viewType"];
  icon: string;
  embedding: number[];
  usageCount: number;
  score: number;
}

export async function searchSimilarTemplates(
  embedding: number[],
  limit: number = 3
): Promise<TemplateSearchResult[]> {
  const results = await SectionTemplate.aggregate([
    {
      $vectorSearch: {
        index: "section_template_embeddings",
        path: "embedding",
        queryVector: embedding,
        numCandidates: limit * 10,
        limit,
        filter: { isShared: true },
      },
    },
    {
      $addFields: {
        score: { $meta: "vectorSearchScore" },
      },
    },
    {
      $project: {
        _id: 1, name: 1, description: 1, fields: 1, viewType: 1,
        icon: 1, embedding: 1, usageCount: 1, score: 1,
      },
    },
  ]);
  return results;
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
