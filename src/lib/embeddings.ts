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
  slug: string;
  description: string;
  fields: ISectionTemplate["fields"];
  viewType: ISectionTemplate["viewType"];
  layoutHtml: string;
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
        _id: 1, name: 1, slug: 1, description: 1, fields: 1, viewType: 1,
        layoutHtml: 1, icon: 1, embedding: 1, usageCount: 1, score: 1,
      },
    },
  ]);
  return results;
}

interface TemplateSaveData {
  name: string;
  slug: string;
  icon: string;
  description: string;
  fields: ISectionTemplate["fields"];
  viewType: ISectionTemplate["viewType"];
  layoutHtml?: string;
  embedding: number[];
  sourcePrompt: string;
  createdBy: string;
}

export interface SaveResult {
  action: "created" | "reused";
  templateId: string;
}

export async function saveOrDedup(
  templateData: TemplateSaveData,
  sourceTemplate: { _id: string; embedding: number[] } | null
): Promise<SaveResult> {
  // No source = generated from scratch, always save
  if (!sourceTemplate) {
    const created = await SectionTemplate.create({
      ...templateData,
      isShared: true,
      forkedFrom: null,
      forkCount: 0,
      usageCount: 1,
    });
    return { action: "created", templateId: String(created._id) };
  }

  // Forked — check if different enough
  if (isSignificantlyDifferent(templateData.embedding, sourceTemplate.embedding)) {
    const created = await SectionTemplate.create({
      ...templateData,
      isShared: true,
      forkedFrom: sourceTemplate._id,
      forkCount: 0,
      usageCount: 1,
    });
    await SectionTemplate.findByIdAndUpdate(sourceTemplate._id, {
      $inc: { forkCount: 1 },
    });
    return { action: "created", templateId: String(created._id) };
  }

  // Not different enough → reuse source
  await SectionTemplate.findByIdAndUpdate(sourceTemplate._id, {
    $inc: { usageCount: 1 },
  });
  return { action: "reused", templateId: sourceTemplate._id };
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
