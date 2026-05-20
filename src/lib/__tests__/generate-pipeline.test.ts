import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/embeddings", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  searchSimilarTemplates: vi.fn().mockResolvedValue([]),
  templateToEmbeddingInput: vi.fn().mockReturnValue("test input"),
  saveOrDedup: vi.fn().mockResolvedValue({ action: "created", templateId: "new123" }),
}));

vi.mock("@/lib/models/section-template", () => ({
  default: {
    findByIdAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

// Mock the Mistral SDK to avoid real API calls from generateWithDefaultAI
vi.mock("@mistralai/mistralai", () => {
  const mockResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          enabledSections: [],
          customSections: [{
            name: "Test Section",
            icon: "Star",
            description: "A test",
            viewType: "table",
            fields: [{ key: "name", label: "Name", type: "text" }],
            layoutHtml: "<div class=\"p-4 text-white\">{name}</div>",
          }],
        }),
      },
    }],
  };
  class MockMistral {
    chat = {
      complete: vi.fn().mockResolvedValue(mockResponse),
    };
  }
  return { Mistral: MockMistral };
});

describe("generateWithTemplateSearch", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("MISTRAL_API_KEY", "test-key");
    vi.clearAllMocks();
  });

  it("generates from scratch when no templates match", async () => {
    const { generateWithTemplateSearch } = await import("@/lib/ai");
    const { searchSimilarTemplates } = await import("@/lib/embeddings");
    vi.mocked(searchSimilarTemplates).mockResolvedValue([]);

    const result = await generateWithTemplateSearch("I collect stamps", "user123");
    expect(result.config).toBeDefined();
    expect(result.config.customSections).toHaveLength(1);
  });

  it("reuses a matched template when score >= 0.85", async () => {
    const { generateWithTemplateSearch } = await import("@/lib/ai");
    const { searchSimilarTemplates } = await import("@/lib/embeddings");
    const SectionTemplate = (await import("@/lib/models/section-template")).default;
    vi.mocked(searchSimilarTemplates).mockResolvedValue([
      {
        _id: "abc123",
        name: "Stamp Tracker",
        slug: "stamp-tracker",
        description: "Track stamps",
        fields: [{ key: "name", label: "Stamp Name", type: "text" as const }],
        viewType: "table",
        layoutHtml: "<div>{name}</div>",
        icon: "Star",
        embedding: new Array(1536).fill(0.1),
        usageCount: 5,
        score: 0.92,
      },
    ]);

    const result = await generateWithTemplateSearch("I collect rare stamps", "user123");
    expect(result.config).toBeDefined();
    expect(result.sourceTemplate?.name).toBe("Stamp Tracker");
    expect(result.saveResult.action).toBe("reused");
    expect(result.saveResult.templateId).toBe("abc123");
    expect(result.config.customSections?.[0]?.layoutHtml).toBe("<div>{name}</div>");
    expect(SectionTemplate.findByIdAndUpdate).toHaveBeenCalledWith("abc123", { $inc: { usageCount: 1 } });
  });

  it("returns save result with action type", async () => {
    const { generateWithTemplateSearch } = await import("@/lib/ai");
    const { searchSimilarTemplates } = await import("@/lib/embeddings");
    vi.mocked(searchSimilarTemplates).mockResolvedValue([]);

    const result = await generateWithTemplateSearch("I collect stamps", "user123");
    expect(result.saveResult).toBeDefined();
    expect(result.saveResult.action).toBe("created");
  });
});
