import { describe, it, expect } from "vitest";
import {
  aiUpdateRequestSchema,
  extraFieldsUpdateSchema,
  dashboardMetricsUpdateSchema,
} from "@/lib/validations";

describe("ai update validations", () => {
  it("accepts a valid update request", () => {
    expect(aiUpdateRequestSchema.parse({ sectionKey: "gym", prompt: "add a temperature field" }))
      .toEqual({ sectionKey: "gym", prompt: "add a temperature field" });
  });
  it("rejects a too-short prompt", () => {
    expect(aiUpdateRequestSchema.safeParse({ sectionKey: "gym", prompt: "x" }).success).toBe(false);
  });
  it("parses an extra-fields update", () => {
    const r = extraFieldsUpdateSchema.parse({ extraFields: [{ key: "temp", label: "Temp", type: "number" }] });
    expect(r.extraFields[0].key).toBe("temp");
  });
  it("parses a dashboard metrics update", () => {
    const r = dashboardMetricsUpdateSchema.parse({
      metrics: [{ label: "Avg sleep", sectionKey: "health", fieldKey: "avgSleep", sourceKind: "builtin", aggregation: "avg", period: "week" }],
    });
    expect(r.metrics[0].label).toBe("Avg sleep");
  });
});
