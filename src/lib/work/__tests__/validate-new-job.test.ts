import { describe, it, expect } from "vitest";
import { validateNewJob } from "../validate-new-job";

describe("validateNewJob", () => {
  it("rejects an empty name", () => {
    const r = validateNewJob([], { name: "  ", hourlyRate: 0, weeklyTarget: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/i);
  });

  it("rejects a case-insensitive duplicate name", () => {
    const r = validateNewJob(["Cafe"], { name: "cafe", hourlyRate: 10, weeklyTarget: 15 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/already/i);
  });

  it("normalizes a valid candidate with defaults", () => {
    const r = validateNewJob(["Cafe"], { name: "  Bar ", hourlyRate: 12, weeklyTarget: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.job).toEqual({
        name: "Bar",
        hourlyRate: 12,
        weeklyTarget: 20,
        active: true,
        enableExpenseTracking: false,
      });
    }
  });
});
