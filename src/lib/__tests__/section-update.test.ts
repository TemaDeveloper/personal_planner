import { describe, it, expect } from "vitest";
import {
  resolveSectionKind,
  validateExtraFields,
  type FieldDef,
} from "@/lib/section-update";

describe("resolveSectionKind", () => {
  it("classifies the dashboard", () => {
    expect(resolveSectionKind("dashboard")).toEqual({ kind: "dashboard" });
  });
  it("classifies a built-in section", () => {
    expect(resolveSectionKind("work")).toEqual({ kind: "builtin", sectionKey: "work" });
    expect(resolveSectionKind("gym")).toEqual({ kind: "builtin", sectionKey: "gym" });
  });
  it("classifies a custom section by its custom: prefix", () => {
    expect(resolveSectionKind("custom:water-intake")).toEqual({ kind: "custom", slug: "water-intake" });
  });
  it("throws on an unknown section key", () => {
    expect(() => resolveSectionKind("nope")).toThrow(/unknown section/i);
  });
});

describe("validateExtraFields", () => {
  const ok: FieldDef[] = [
    { key: "tips", label: "Tips", type: "number" },
    { key: "mood", label: "Mood", type: "select", options: ["good", "bad"] },
  ];
  it("accepts a clean, unique set", () => {
    expect(validateExtraFields(ok)).toEqual(ok);
  });
  it("rejects duplicate keys", () => {
    expect(() => validateExtraFields([...ok, { key: "tips", label: "Tips 2", type: "text" }])).toThrow(/duplicate/i);
  });
  it("rejects empty keys", () => {
    expect(() => validateExtraFields([{ key: "", label: "X", type: "text" }])).toThrow(/key/i);
  });
});

import { BUILTIN_METRIC_REGISTRY, registryForSections } from "@/lib/dashboard-metric-registry";

describe("dashboard metric registry", () => {
  it("has known built-in metrics with stable keys", () => {
    const keys = BUILTIN_METRIC_REGISTRY.map((m) => m.key);
    expect(keys).toContain("work.weekEarnings");
    expect(keys).toContain("gym.daysThisWeek");
  });
  it("filters to enabled sections only", () => {
    const r = registryForSections(["gym"]);
    expect(r.every((m) => m.sectionKey === "gym")).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
});
