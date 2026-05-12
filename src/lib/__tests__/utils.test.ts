import { describe, it, expect } from "vitest";
import { cn, formatCurrency } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });
});

describe("formatCurrency", () => {
  it("formats CAD by default", () => {
    const result = formatCurrency(100);
    expect(result).toContain("100.00");
  });

  it("formats USD", () => {
    const result = formatCurrency(50.5, "USD");
    expect(result).toContain("50.50");
  });

  it("formats zero", () => {
    const result = formatCurrency(0, "EUR");
    expect(result).toContain("0.00");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-25.99, "CAD");
    expect(result).toContain("25.99");
  });
});
