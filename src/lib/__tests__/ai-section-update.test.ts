// src/lib/__tests__/ai-section-update.test.ts
import { describe, it, expect } from "vitest";
import {
  buildBuiltinFieldPrompt,
  parseExtraFieldsResponse,
  buildDashboardMetricPrompt,
  parseDashboardMetricsResponse,
} from "@/lib/ai-section-update";

describe("builtin field update prompt", () => {
  it("includes the section label, current fields, and the user request", () => {
    const p = buildBuiltinFieldPrompt("Gym", [{ key: "tips", label: "Tips", type: "number" }], "add a temperature field");
    expect(p).toContain("Gym");
    expect(p).toContain("tips");
    expect(p).toContain("add a temperature field");
  });
});

describe("parseExtraFieldsResponse", () => {
  it("extracts and validates fields from a fenced JSON reply", () => {
    const raw = "```json\n{\"extraFields\":[{\"key\":\"temp\",\"label\":\"Temp\",\"type\":\"number\"}]}\n```";
    expect(parseExtraFieldsResponse(raw).extraFields[0].key).toBe("temp");
  });
  it("throws on invalid JSON content", () => {
    expect(() => parseExtraFieldsResponse("not json")).toThrow();
  });
});

describe("dashboard metric prompt + parse", () => {
  it("lists the available registry metrics", () => {
    const p = buildDashboardMetricPrompt(
      [{ key: "health.avgSleep", label: "Average sleep", sectionKey: "health" }],
      [],
      "add my average sleep"
    );
    expect(p).toContain("health.avgSleep");
    expect(p).toContain("average sleep");
  });
  it("parses a metrics reply", () => {
    const raw = '{"metrics":[{"label":"Avg sleep","sectionKey":"health","fieldKey":"avgSleep","sourceKind":"builtin","aggregation":"avg","period":"week"}]}';
    expect(parseDashboardMetricsResponse(raw).metrics[0].fieldKey).toBe("avgSleep");
  });
});
