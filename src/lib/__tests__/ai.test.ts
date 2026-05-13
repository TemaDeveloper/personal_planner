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
