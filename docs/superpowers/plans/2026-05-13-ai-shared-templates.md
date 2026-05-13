# AI Shared Section Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When users describe what they want to track, search a shared template pool via vector embeddings before generating. Fork & adapt matches, save new templates back to the pool, and rank by usage.

**Architecture:** New `embeddings.ts` utility handles OpenAI embedding generation + Atlas Vector Search queries. The existing `ai.ts` generation pipeline is augmented with a search-then-generate flow. `SectionTemplate` model gets new fields for embeddings, lineage, and sharing. The onboarding API route orchestrates the full pipeline.

**Tech Stack:** MongoDB Atlas Vector Search, OpenAI text-embedding-3-small, Mongoose, Vitest

**Spec:** `docs/superpowers/specs/2026-05-13-ai-shared-templates-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/embeddings.ts` | Create | Embedding generation, vector search, cosine distance, dedup check |
| `src/lib/__tests__/embeddings.test.ts` | Create | Tests for embeddings utility |
| `src/lib/models/section-template.ts` | Modify | Add embedding, sourcePrompt, forkedFrom, forkCount, isShared fields |
| `src/lib/ai.ts` | Modify | Add template-augmented prompt builder, export augmented generation fn |
| `src/lib/__tests__/ai.test.ts` | Create | Tests for AI prompt augmentation and pipeline logic |
| `src/app/api/onboarding/generate/route.ts` | Modify | Orchestrate search → generate → save pipeline |
| `src/lib/scripts/backfill-embeddings.ts` | Create | One-time script to backfill embeddings for existing templates |

---

### Task 1: Extend SectionTemplate Schema

**Files:**
- Modify: `src/lib/models/section-template.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/section-template.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mongoose before importing the model
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    default: {
      ...actual.default,
      models: {},
      model: vi.fn().mockImplementation((name, schema) => {
        return { modelName: name, schema };
      }),
      deleteModel: vi.fn(),
    },
  };
});

describe("SectionTemplate schema", () => {
  it("has embedding field defined as array of Numbers", async () => {
    const mod = await import("@/lib/models/section-template");
    const schema = mod.default.schema;
    const embeddingPath = schema.path("embedding");
    expect(embeddingPath).toBeDefined();
  });

  it("has sourcePrompt field as String", async () => {
    const mod = await import("@/lib/models/section-template");
    const schema = mod.default.schema;
    const path = schema.path("sourcePrompt");
    expect(path).toBeDefined();
  });

  it("has forkedFrom field as ObjectId ref", async () => {
    const mod = await import("@/lib/models/section-template");
    const schema = mod.default.schema;
    const path = schema.path("forkedFrom");
    expect(path).toBeDefined();
  });

  it("has forkCount with default 0", async () => {
    const mod = await import("@/lib/models/section-template");
    const schema = mod.default.schema;
    const path = schema.path("forkCount");
    expect(path).toBeDefined();
  });

  it("has isShared with default true", async () => {
    const mod = await import("@/lib/models/section-template");
    const schema = mod.default.schema;
    const path = schema.path("isShared");
    expect(path).toBeDefined();
  });

  it("exports ISectionTemplate interface with new fields", async () => {
    // Type check — this test verifies the interface compiles correctly
    const mod = await import("@/lib/models/section-template");
    type T = typeof mod.ISectionTemplate;
    expect(mod.default).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/section-template.test.ts`
Expected: FAIL — embedding, sourcePrompt, forkedFrom, forkCount, isShared paths not found on schema

- [ ] **Step 3: Add new fields to the SectionTemplate schema**

In `src/lib/models/section-template.ts`, add to the `ISectionTemplate` interface:

```typescript
export interface ISectionTemplate extends Document {
  name: string;
  slug: string;
  icon: string;
  description: string;
  fields: IFieldDefinition[];
  viewType: "weekly-cards" | "table" | "grid";
  isBuiltIn: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  usageCount: number;
  // New fields for shared template pool
  embedding: number[];
  sourcePrompt: string;
  forkedFrom: mongoose.Types.ObjectId | null;
  forkCount: number;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Add to `SectionTemplateSchema`:

```typescript
    embedding: { type: [Number], default: [] },
    sourcePrompt: { type: String, default: "" },
    forkedFrom: { type: Schema.Types.ObjectId, ref: "SectionTemplate", default: null },
    forkCount: { type: Number, default: 0 },
    isShared: { type: Boolean, default: true },
```

Add a new index for shared template queries:

```typescript
SectionTemplateSchema.index({ isShared: 1, usageCount: -1 });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/section-template.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/models/section-template.ts src/lib/__tests__/section-template.test.ts
git commit -m "feat: extend SectionTemplate schema with embedding and sharing fields"
```

---

### Task 2: Create Embeddings Utility — Core Functions

**Files:**
- Create: `src/lib/embeddings.ts`
- Create: `src/lib/__tests__/embeddings.test.ts`

- [ ] **Step 1: Write failing tests for computeDistance and isSignificantlyDifferent**

Create `src/lib/__tests__/embeddings.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeDistance, isSignificantlyDifferent } from "@/lib/embeddings";

describe("computeDistance", () => {
  it("returns 0 for identical vectors", () => {
    const v = [1, 0, 0];
    expect(computeDistance(v, v)).toBeCloseTo(0);
  });

  it("returns 1 for orthogonal vectors", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(computeDistance(a, b)).toBeCloseTo(1);
  });

  it("returns 2 for opposite vectors", () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(computeDistance(a, b)).toBeCloseTo(2);
  });

  it("handles normalized embedding-like vectors", () => {
    const a = [0.5, 0.5, 0.5, 0.5];
    const b = [0.5, 0.5, 0.5, 0.5];
    expect(computeDistance(a, b)).toBeCloseTo(0);
  });
});

describe("isSignificantlyDifferent", () => {
  it("returns false for identical embeddings", () => {
    const v = [1, 0, 0];
    expect(isSignificantlyDifferent(v, v)).toBe(false);
  });

  it("returns true for very different embeddings", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(isSignificantlyDifferent(a, b)).toBe(true);
  });

  it("returns false for slightly different embeddings (below 0.10 threshold)", () => {
    // Two vectors with small angle between them
    const a = [1, 0, 0];
    const b = [0.995, 0.1, 0]; // cosine distance ≈ 0.005
    expect(isSignificantlyDifferent(a, b)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement computeDistance and isSignificantlyDifferent**

Create `src/lib/embeddings.ts`:

```typescript
import OpenAI from "openai";

const DEDUP_THRESHOLD = 0.10; // cosine distance; start conservative (0.10 = very similar)

/**
 * Cosine distance between two vectors: 1 - cosine_similarity.
 * Returns 0 for identical, 2 for opposite.
 */
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

/**
 * Returns true if the cosine distance exceeds the dedup threshold,
 * meaning the two templates are different enough to be separate entries.
 */
export function isSignificantlyDifferent(a: number[], b: number[]): boolean {
  return computeDistance(a, b) > DEDUP_THRESHOLD;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeddings.ts src/lib/__tests__/embeddings.test.ts
git commit -m "feat: add cosine distance and dedup check utilities"
```

---

### Task 3: Create Embeddings Utility — OpenAI Integration

**Files:**
- Modify: `src/lib/embeddings.ts`
- Modify: `src/lib/__tests__/embeddings.test.ts`

- [ ] **Step 1: Write failing tests for generateEmbedding and templateToEmbeddingInput**

Add to `src/lib/__tests__/embeddings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeDistance, isSignificantlyDifferent, templateToEmbeddingInput } from "@/lib/embeddings";

// Add this mock at the top of the file, before all describes:
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: [{ embedding: new Array(1536).fill(0.1) }],
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

// Add these new describe blocks:

describe("templateToEmbeddingInput", () => {
  it("formats template fields into a searchable string", () => {
    const result = templateToEmbeddingInput(
      "Tire Reselling",
      "Track tire purchases and sales",
      [
        { key: "item", label: "Tire Model", type: "text" as const },
        { key: "price", label: "Purchase Price", type: "number" as const },
      ]
    );
    expect(result).toBe(
      "Tire Reselling — Track tire purchases and sales. Fields: Tire Model (text), Purchase Price (number)"
    );
  });

  it("handles empty fields array", () => {
    const result = templateToEmbeddingInput("Test", "A test section", []);
    expect(result).toBe("Test — A test section. Fields: ");
  });
});

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
  });

  it("calls OpenAI embeddings API and returns vector", async () => {
    const { generateEmbedding } = await import("@/lib/embeddings");
    const result = await generateEmbedding("test text");
    expect(result).toHaveLength(1536);
    expect(result[0]).toBe(0.1);
  });

  it("throws if OPENAI_API_KEY is not set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    // Re-import to get fresh module
    vi.resetModules();
    const { generateEmbedding } = await import("@/lib/embeddings");
    await expect(generateEmbedding("test")).rejects.toThrow("OPENAI_API_KEY");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: FAIL — generateEmbedding and templateToEmbeddingInput not exported

- [ ] **Step 3: Implement generateEmbedding and templateToEmbeddingInput**

Add to `src/lib/embeddings.ts`:

```typescript
import type { IFieldDefinition } from "@/lib/models/section-template";

const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Formats template metadata into a string for embedding generation.
 * Captures semantic purpose + structural shape.
 */
export function templateToEmbeddingInput(
  name: string,
  description: string,
  fields: Pick<IFieldDefinition, "label" | "type">[]
): string {
  const fieldStr = fields.map((f) => `${f.label} (${f.type})`).join(", ");
  return `${name} — ${description}. Fields: ${fieldStr}`;
}

/**
 * Generate a 1536-dim embedding vector using OpenAI text-embedding-3-small.
 */
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeddings.ts src/lib/__tests__/embeddings.test.ts
git commit -m "feat: add OpenAI embedding generation and template input formatter"
```

---

### Task 4: Create Embeddings Utility — Atlas Vector Search

**Files:**
- Modify: `src/lib/embeddings.ts`
- Modify: `src/lib/__tests__/embeddings.test.ts`

- [ ] **Step 1: Write failing test for searchSimilarTemplates**

Add to `src/lib/__tests__/embeddings.test.ts`:

```typescript
// Add this mock at the top, alongside the openai mock:
vi.mock("@/lib/models/section-template", () => {
  const mockAggregate = vi.fn().mockResolvedValue([
    {
      _id: "abc123",
      name: "Pet Breeding Tracker",
      score: 0.92,
      usageCount: 5,
      fields: [],
    },
  ]);
  return {
    default: { aggregate: mockAggregate },
    __mockAggregate: mockAggregate,
  };
});

describe("searchSimilarTemplates", () => {
  it("returns matching templates from vector search", async () => {
    const { searchSimilarTemplates } = await import("@/lib/embeddings");
    const embedding = new Array(1536).fill(0.1);
    const results = await searchSimilarTemplates(embedding);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Pet Breeding Tracker");
    expect(results[0].score).toBe(0.92);
  });

  it("accepts a custom limit parameter", async () => {
    vi.resetModules();
    const SectionTemplate = (await import("@/lib/models/section-template")).default;
    const { searchSimilarTemplates } = await import("@/lib/embeddings");
    const embedding = new Array(1536).fill(0.1);
    await searchSimilarTemplates(embedding, 5);
    expect(SectionTemplate.aggregate).toHaveBeenCalled();
    const pipeline = (SectionTemplate.aggregate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const vectorStage = pipeline.find((s: Record<string, unknown>) => "$vectorSearch" in s);
    expect(vectorStage.$vectorSearch.limit).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: FAIL — searchSimilarTemplates not exported

- [ ] **Step 3: Implement searchSimilarTemplates**

Add to `src/lib/embeddings.ts`:

```typescript
import SectionTemplate, { type ISectionTemplate } from "@/lib/models/section-template";

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

/**
 * Search for similar templates using MongoDB Atlas Vector Search.
 * Returns top matches ordered by cosine similarity, filtered by isShared.
 */
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
        _id: 1,
        name: 1,
        description: 1,
        fields: 1,
        viewType: 1,
        icon: 1,
        embedding: 1,
        usageCount: 1,
        score: 1,
      },
    },
  ]);
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeddings.ts src/lib/__tests__/embeddings.test.ts
git commit -m "feat: add Atlas Vector Search for similar template lookup"
```

---

### Task 5: AI Prompt Augmentation

**Files:**
- Modify: `src/lib/ai.ts`
- Create: `src/lib/__tests__/ai.test.ts`

- [ ] **Step 1: Write failing tests for buildAugmentedPrompt**

Create `src/lib/__tests__/ai.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildAugmentedPrompt } from "@/lib/ai";

describe("buildAugmentedPrompt", () => {
  const mockTemplate = {
    name: "Pet Breeding Tracker",
    fields: [
      { key: "litter", label: "Litter Name", type: "text" as const },
      { key: "count", label: "Puppy Count", type: "number" as const },
    ],
    viewType: "table" as const,
  };

  it("includes the original user prompt", () => {
    const result = buildAugmentedPrompt("I breed golden retrievers", mockTemplate, 0.92);
    expect(result).toContain("I breed golden retrievers");
  });

  it("includes template name for strong matches (>= 0.85)", () => {
    const result = buildAugmentedPrompt("I breed dogs", mockTemplate, 0.92);
    expect(result).toContain("Pet Breeding Tracker");
    expect(result).toContain("Adapt this template");
  });

  it("includes template as inspiration for weak matches (0.70-0.84)", () => {
    const result = buildAugmentedPrompt("I breed dogs", mockTemplate, 0.75);
    expect(result).toContain("Pet Breeding Tracker");
    expect(result).toContain("inspiration");
  });

  it("returns just the prompt for no match (< 0.70)", () => {
    const result = buildAugmentedPrompt("I collect stamps", mockTemplate, 0.45);
    expect(result).not.toContain("Pet Breeding Tracker");
    expect(result).toBe("I collect stamps");
  });

  it("includes field definitions in augmented prompt", () => {
    const result = buildAugmentedPrompt("I breed dogs", mockTemplate, 0.92);
    expect(result).toContain("Litter Name");
    expect(result).toContain("Puppy Count");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/ai.test.ts`
Expected: FAIL — buildAugmentedPrompt not exported

- [ ] **Step 3: Implement buildAugmentedPrompt**

Add to `src/lib/ai.ts`, after the existing imports:

```typescript
import type { IFieldDefinition } from "@/lib/models/section-template";

interface MatchedTemplate {
  name: string;
  fields: Pick<IFieldDefinition, "key" | "label" | "type" | "options" | "formula">[];
  viewType: string;
}

const STRONG_MATCH_THRESHOLD = 0.85;
const WEAK_MATCH_THRESHOLD = 0.70;

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/ai.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai.ts src/lib/__tests__/ai.test.ts
git commit -m "feat: add template-augmented prompt builder for fork & adapt"
```

---

### Task 6: Template Save & Dedup Logic

**Files:**
- Modify: `src/lib/embeddings.ts`
- Modify: `src/lib/__tests__/embeddings.test.ts`

- [ ] **Step 1: Write failing tests for saveOrDedup**

Add to `src/lib/__tests__/embeddings.test.ts`:

```typescript
// Update the section-template mock to include create, findByIdAndUpdate:
vi.mock("@/lib/models/section-template", () => {
  const mockAggregate = vi.fn().mockResolvedValue([
    {
      _id: "abc123",
      name: "Pet Breeding Tracker",
      score: 0.92,
      usageCount: 5,
      fields: [],
      embedding: new Array(1536).fill(0.1),
    },
  ]);
  const mockCreate = vi.fn().mockImplementation((data) => ({
    ...data,
    _id: "new123",
    save: vi.fn().mockResolvedValue({ ...data, _id: "new123" }),
  }));
  const mockFindByIdAndUpdate = vi.fn().mockResolvedValue({ _id: "abc123", usageCount: 6 });
  return {
    default: {
      aggregate: mockAggregate,
      create: mockCreate,
      findByIdAndUpdate: mockFindByIdAndUpdate,
    },
    __mockAggregate: mockAggregate,
    __mockCreate: mockCreate,
    __mockFindByIdAndUpdate: mockFindByIdAndUpdate,
  };
});

describe("saveOrDedup", () => {
  it("creates a new template when no source (generated from scratch)", async () => {
    const { saveOrDedup } = await import("@/lib/embeddings");
    const SectionTemplate = (await import("@/lib/models/section-template")).default;

    const templateData = {
      name: "Stamp Collection",
      slug: "stamp-collection",
      icon: "Star",
      description: "Track stamps",
      fields: [],
      viewType: "table" as const,
      embedding: new Array(1536).fill(0.2),
      sourcePrompt: "I collect stamps",
      createdBy: "user123",
    };

    const result = await saveOrDedup(templateData, null);
    expect(SectionTemplate.create).toHaveBeenCalled();
    expect(result.action).toBe("created");
  });

  it("increments usageCount when fork is not significantly different", async () => {
    vi.resetModules();
    const { saveOrDedup } = await import("@/lib/embeddings");
    const SectionTemplate = (await import("@/lib/models/section-template")).default;

    const templateData = {
      name: "Pet Breeding Tracker",
      slug: "pet-breeding-tracker-2",
      icon: "PawPrint",
      description: "Track pet breeding",
      fields: [],
      viewType: "table" as const,
      embedding: new Array(1536).fill(0.1), // same as source = not different
      sourcePrompt: "I breed dogs",
      createdBy: "user456",
    };

    const sourceTemplate = {
      _id: "abc123",
      embedding: new Array(1536).fill(0.1),
    };

    const result = await saveOrDedup(templateData, sourceTemplate);
    expect(result.action).toBe("reused");
    expect(SectionTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
      "abc123",
      { $inc: { usageCount: 1 } }
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: FAIL — saveOrDedup not exported

- [ ] **Step 3: Implement saveOrDedup**

Add to `src/lib/embeddings.ts`:

```typescript
interface TemplateSaveData {
  name: string;
  slug: string;
  icon: string;
  description: string;
  fields: ISectionTemplate["fields"];
  viewType: ISectionTemplate["viewType"];
  embedding: number[];
  sourcePrompt: string;
  createdBy: string;
}

interface SaveResult {
  action: "created" | "reused";
  templateId: string;
}

/**
 * Save a generated template to the shared pool, or increment usage on the source
 * if the fork isn't different enough.
 */
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
    // Different enough → new template
    const created = await SectionTemplate.create({
      ...templateData,
      isShared: true,
      forkedFrom: sourceTemplate._id,
      forkCount: 0,
      usageCount: 1,
    });
    // Increment fork count on source
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/embeddings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeddings.ts src/lib/__tests__/embeddings.test.ts
git commit -m "feat: add save-or-dedup logic for shared template pool"
```

---

### Task 7: Orchestrate the Full Pipeline in the Onboarding Route

**Files:**
- Modify: `src/app/api/onboarding/generate/route.ts`
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Write failing test for the pipeline integration**

Create `src/lib/__tests__/generate-pipeline.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies
vi.mock("@/lib/embeddings", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  searchSimilarTemplates: vi.fn().mockResolvedValue([]),
  templateToEmbeddingInput: vi.fn().mockReturnValue("test input"),
  saveOrDedup: vi.fn().mockResolvedValue({ action: "created", templateId: "new123" }),
}));

vi.mock("@/lib/ai", async () => {
  const actual = await vi.importActual("@/lib/ai");
  return {
    ...actual,
    generateWithDefaultAI: vi.fn().mockResolvedValue({
      enabledSections: [],
      customSections: [
        {
          name: "Test Section",
          icon: "Star",
          description: "A test",
          viewType: "table",
          fields: [{ key: "name", label: "Name", type: "text" }],
        },
      ],
    }),
  };
});

describe("generateWithTemplateSearch", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("MISTRAL_API_KEY", "test-key");
  });

  it("generates from scratch when no templates match", async () => {
    const { generateWithTemplateSearch } = await import("@/lib/ai");
    const { searchSimilarTemplates } = await import("@/lib/embeddings");
    vi.mocked(searchSimilarTemplates).mockResolvedValue([]);

    const result = await generateWithTemplateSearch("I collect stamps", "user123");
    expect(result.config).toBeDefined();
    expect(result.config.customSections).toHaveLength(1);
  });

  it("forks a matched template when score >= 0.85", async () => {
    const { generateWithTemplateSearch } = await import("@/lib/ai");
    const { searchSimilarTemplates } = await import("@/lib/embeddings");
    vi.mocked(searchSimilarTemplates).mockResolvedValue([
      {
        _id: "abc123",
        name: "Stamp Tracker",
        description: "Track stamps",
        fields: [],
        viewType: "table",
        icon: "Star",
        embedding: new Array(1536).fill(0.1),
        usageCount: 5,
        score: 0.92,
      },
    ]);

    const result = await generateWithTemplateSearch("I collect rare stamps", "user123");
    expect(result.config).toBeDefined();
    expect(result.sourceTemplate).toBeDefined();
  });

  it("returns save result with action type", async () => {
    const { generateWithTemplateSearch } = await import("@/lib/ai");
    const result = await generateWithTemplateSearch("I collect stamps", "user123");
    expect(result.saveResult).toBeDefined();
    expect(result.saveResult.action).toBe("created");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/generate-pipeline.test.ts`
Expected: FAIL — generateWithTemplateSearch not exported from ai.ts

- [ ] **Step 3: Implement generateWithTemplateSearch in ai.ts**

Add to the bottom of `src/lib/ai.ts`:

```typescript
import {
  generateEmbedding,
  searchSimilarTemplates,
  templateToEmbeddingInput,
  saveOrDedup,
  type TemplateSearchResult,
} from "@/lib/embeddings";

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

/**
 * Full pipeline: search shared templates → generate (with augmented prompt if match found)
 * → save/dedup → return config.
 */
export async function generateWithTemplateSearch(
  prompt: string,
  userId: string
): Promise<PipelineResult> {
  // Step 1: Generate embedding for the user's prompt
  let promptEmbedding: number[] | null = null;
  let searchResults: TemplateSearchResult[] = [];

  try {
    promptEmbedding = await generateEmbedding(prompt);
    searchResults = await searchSimilarTemplates(promptEmbedding);
  } catch {
    // If embedding/search fails, fall through to generate from scratch
    console.warn("[generate] Embedding search failed, generating from scratch");
  }

  // Step 2: Pick best match
  const bestMatch = searchResults.length > 0 ? searchResults[0] : null;
  const bestScore = bestMatch?.score ?? 0;

  // Step 3: Build augmented prompt and generate
  const augmentedPrompt = buildAugmentedPrompt(
    prompt,
    bestMatch ? { name: bestMatch.name, fields: bestMatch.fields, viewType: bestMatch.viewType } : null,
    bestScore
  );

  const config = await generateWithDefaultAI(augmentedPrompt);

  // Step 4: Save each custom section to the shared pool
  let saveResult = { action: "created" as const, templateId: "" };

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
```

Also add the needed import at the top of ai.ts:

```typescript
import type { ISectionTemplate } from "@/lib/models/section-template";
```

And export the thresholds so they can be reused:

```typescript
export const STRONG_MATCH_THRESHOLD = 0.85;
export const WEAK_MATCH_THRESHOLD = 0.70;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/generate-pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai.ts src/lib/__tests__/generate-pipeline.test.ts
git commit -m "feat: add full search-generate-save pipeline for shared templates"
```

---

### Task 8: Update the Onboarding API Route

**Files:**
- Modify: `src/app/api/onboarding/generate/route.ts`

- [ ] **Step 1: Update the route to use the new pipeline**

Replace the body of the try block in `src/app/api/onboarding/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { generateWithDefaultAI, generateWithTemplateSearch } from "@/lib/ai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = await resolveUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mistralKey = process.env.MISTRAL_API_KEY;
    if (!mistralKey) {
      return NextResponse.json(
        { error: "AI is not configured on this server (MISTRAL_API_KEY missing)" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Please describe what you want to track" },
        { status: 400 }
      );
    }

    // Use template search pipeline if OPENAI_API_KEY is available,
    // otherwise fall back to direct generation
    const hasEmbeddingSupport = !!process.env.OPENAI_API_KEY;

    if (hasEmbeddingSupport) {
      const { config } = await generateWithTemplateSearch(prompt.trim(), String(userId));
      return NextResponse.json({ config });
    }

    // Fallback: no embedding support, generate directly
    const config = await generateWithDefaultAI(prompt.trim());
    return NextResponse.json({ config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[onboarding/generate] Error:", message);
    if (stack) console.error("[onboarding/generate] Stack:", stack);

    return NextResponse.json(
      { error: message.slice(0, 200) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Run all tests to verify nothing is broken**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/onboarding/generate/route.ts
git commit -m "feat: wire onboarding route to shared template search pipeline"
```

---

### Task 9: Backfill Script for Existing Templates

**Files:**
- Create: `src/lib/scripts/backfill-embeddings.ts`

- [ ] **Step 1: Create the backfill script**

Create `src/lib/scripts/backfill-embeddings.ts`:

```typescript
/**
 * One-time script to backfill embeddings for existing SectionTemplate documents.
 *
 * Run with: npx tsx src/lib/scripts/backfill-embeddings.ts
 *
 * Requires OPENAI_API_KEY and MONGODB_URI environment variables.
 */

import mongoose from "mongoose";
import SectionTemplate from "@/lib/models/section-template";
import { generateEmbedding, templateToEmbeddingInput } from "@/lib/embeddings";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const templates = await SectionTemplate.find({
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
  });

  console.log(`Found ${templates.length} templates without embeddings`);

  for (const template of templates) {
    const input = templateToEmbeddingInput(
      template.name,
      template.description,
      template.fields
    );

    try {
      const embedding = await generateEmbedding(input);
      template.embedding = embedding;
      template.isShared = true;
      await template.save();
      console.log(`✓ ${template.name} (${template.slug})`);
    } catch (err) {
      console.error(`✗ ${template.name}: ${err}`);
    }

    // Rate limit: OpenAI embeddings API allows ~3000 RPM, but be nice
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("Done");
  await mongoose.disconnect();
}

main().catch(console.error);
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/lib/scripts/backfill-embeddings.ts` (or just verify no red squiggles)

- [ ] **Step 3: Commit**

```bash
git add src/lib/scripts/backfill-embeddings.ts
git commit -m "feat: add backfill script for existing template embeddings"
```

---

### Task 10: Atlas Vector Search Index Setup

This task is manual infrastructure setup, not code.

- [ ] **Step 1: Document the Atlas index creation**

The vector search index must be created in MongoDB Atlas console or via the Atlas CLI. The index definition:

```json
{
  "name": "section_template_embeddings",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "path": "embedding",
        "type": "vector",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      {
        "path": "isShared",
        "type": "filter"
      }
    ]
  }
}
```

**Steps:**
1. Go to Atlas console → your cluster → Search tab
2. Click "Create Search Index"
3. Select "JSON Editor"
4. Choose the `sectiontemplates` collection
5. Paste the index definition above
6. Name it `section_template_embeddings`
7. Click "Create"

- [ ] **Step 2: Add OPENAI_API_KEY to environment**

Add to `.env.local` and Vercel environment variables:

```
OPENAI_API_KEY=sk-...
```

- [ ] **Step 3: Run the backfill script**

```bash
npx tsx src/lib/scripts/backfill-embeddings.ts
```

Expected: All existing templates get embeddings generated and saved.

- [ ] **Step 4: Run the full test suite one final time**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final cleanup for shared template feature"
```
