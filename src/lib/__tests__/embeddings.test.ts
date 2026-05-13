import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeDistance, isSignificantlyDifferent, templateToEmbeddingInput } from "@/lib/embeddings";

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

vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: [{ embedding: new Array(1536).fill(0.1) }],
  });
  return {
    default: vi.fn(function () {
      return { embeddings: { create: mockCreate } };
    }),
    __mockCreate: mockCreate,
  };
});

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
    const a = [1, 0, 0];
    const b = [0.995, 0.1, 0]; // cosine distance ≈ 0.005
    expect(isSignificantlyDifferent(a, b)).toBe(false);
  });
});

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
    vi.resetModules();
    const { generateEmbedding } = await import("@/lib/embeddings");
    await expect(generateEmbedding("test")).rejects.toThrow("OPENAI_API_KEY");
  });
});

describe("searchSimilarTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
