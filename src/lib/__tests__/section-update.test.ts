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
