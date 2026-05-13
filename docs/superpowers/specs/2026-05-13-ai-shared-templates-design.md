# AI-Generated Shared Section Templates

**Date:** 2026-05-13
**Status:** Approved

## Overview

When users describe what they want to track, the AI generates custom UI sections. These sections are automatically published to a shared template pool backed by MongoDB Atlas Vector Search. Future users with similar needs get matched to existing templates, which the AI forks and adapts rather than generating from scratch. Templates are ranked by usage count so the best ones naturally rise to the top.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sharing model | Auto-publish | Every AI-generated section enters the shared pool automatically |
| Template matching | Semantic search (embeddings) | Fast, scalable, language-agnostic similarity |
| Reuse behavior | Fork & adapt | AI uses matched template as starting point, tailors to user |
| Deduplication | Embedding distance | If forked result is close enough to source, increment usage instead of creating new |
| Quality control | Usage-based ranking | Search results ordered by usage count; good templates rise naturally |
| Vector storage | MongoDB Atlas Vector Search | No new infrastructure; already on MongoDB + Vercel |
| Embedding model | OpenAI text-embedding-3-small | Cheap, fast, 1536 dimensions, good quality |

## Data Model

### SectionTemplate — New Fields

Add to existing `SectionTemplate` schema in `/lib/models/section-template.ts`:

```typescript
{
  // Existing fields unchanged (name, description, fields, viewType, etc.)

  embedding: [Number],         // 1536-dim vector from text-embedding-3-small
  sourcePrompt: String,        // Original user prompt that created this template
  forkedFrom: ObjectId | null, // Reference to parent template (null if original)
  usageCount: { type: Number, default: 1 },
  forkCount: { type: Number, default: 0 },
  isShared: { type: Boolean, default: true },
  createdBy: ObjectId,         // User who triggered the generation
}
```

### Atlas Vector Search Index

Create a vector search index on the `sectiontemplates` collection:

```json
{
  "type": "vectorSearch",
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
```

### Embedding Input

Concatenation of template fields for embedding generation:

```
{name} — {description}. Fields: {field1.label} ({field1.type}), {field2.label} ({field2.type}), ...
```

This captures both the semantic purpose and the structural shape of the template.

## Generation & Search Flow

### Pipeline (triggered from `/app/api/onboarding/generate`)

**Step 1 — Generate prompt embedding**
Call OpenAI embeddings API with the user's natural language prompt.

**Step 2 — Vector search**
Query Atlas Vector Search for top 3 matches from `sectiontemplates` where `isShared: true`, ordered by cosine similarity, weighted by `usageCount`.

**Step 3 — Decision logic**

| Similarity Score | Action |
|-----------------|--------|
| ≥ 0.85 | **Strong match.** Fork top result — pass template fields to AI as starting point. AI adapts for the specific user. |
| 0.70 – 0.84 | **Weak match.** Pass top results as inspiration. AI generates mostly from scratch but informed by existing templates. |
| < 0.70 | **No match.** Generate entirely from scratch. |

**Step 4 — Save & deduplicate**
- Generate embedding for the *output* template (not the prompt).
- If forked: compare output embedding to source template embedding.
  - Distance > dedup threshold → Save as **new template**, set `forkedFrom`, increment source's `forkCount`.
  - Distance ≤ dedup threshold → **Don't create new template**, increment source's `usageCount`.
- If generated from scratch → Always save as new template.

**Step 5 — Link to user**
Attach template to user's planner config, same as current behavior.

### AI Prompt Augmentation

When a matching template is found, the AI generation prompt is augmented with:

```
Existing template found: "{template.name}"
Fields: {JSON of template.fields}
ViewType: {template.viewType}

Adapt this template for the user's specific needs: "{user prompt}"
You may add, remove, or rename fields. Keep the general structure if it fits.
```

## Integration Points

### Modified Files

**`/lib/ai.ts`**
- Augment generation function to include search-then-generate pipeline
- Add matched template context to AI prompt when available
- Post-generation: compute output embedding and run dedup logic

**`/app/api/onboarding/generate`**
- Entry point unchanged from user perspective
- Internally: search first, then generate or fork
- API response shape unchanged

**`/lib/models/section-template.ts`**
- Add new fields to schema
- Add index definitions

### New Files

**`/lib/embeddings.ts`**
Thin utility module:

```typescript
generateEmbedding(text: string): Promise<number[]>
// Calls OpenAI text-embedding-3-small

searchSimilarTemplates(embedding: number[], limit?: number): Promise<SectionTemplate[]>
// Atlas Vector Search query, filtered by isShared, weighted by usageCount

computeDistance(embA: number[], embB: number[]): number
// Cosine distance between two embeddings

isSignificantlyDifferent(embA: number[], embB: number[]): boolean
// Returns true if distance exceeds dedup threshold
```

### Infrastructure

**One-time Atlas setup:**
- Create vector search index on `sectiontemplates` collection via Atlas console or CLI
- Backfill embeddings for existing templates by running embedding API on their `name + description + fields`

### No UI Changes

This feature is entirely backend. The user experience remains: describe what you want → get a section. The system gets smarter and faster over time as the template pool grows.

## Thresholds

| Parameter | Value | Notes |
|-----------|-------|-------|
| Match threshold (strong) | 0.85 | Fork and adapt |
| Match threshold (weak) | 0.70 | Use as inspiration |
| Dedup threshold | TBD — tune after testing | How different a fork must be to count as new |
| Embedding dimensions | 1536 | text-embedding-3-small default |
| Search limit | 3 | Top N results returned |

The dedup threshold needs empirical tuning. Start with 0.90 (conservative — most forks become new templates) and tighten as the pool grows.

## Out of Scope

- Template browsing UI / marketplace
- Manual template editing by users
- Template deletion or moderation tools
- Multi-language embedding support
- Template versioning (forkFrom chain is sufficient for now)
