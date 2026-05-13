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
    const a = [1, 0, 0];
    const b = [0.995, 0.1, 0]; // cosine distance ≈ 0.005
    expect(isSignificantlyDifferent(a, b)).toBe(false);
  });
});
