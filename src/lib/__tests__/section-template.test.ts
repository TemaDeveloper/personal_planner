import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import SectionTemplate from "@/lib/models/section-template";

describe("SectionTemplate schema", () => {
  it("has embedding field as array of Numbers defaulting to []", () => {
    const schemaPaths = SectionTemplate.schema.paths;
    expect(schemaPaths["embedding"]).toBeDefined();
    const instance = new SectionTemplate({ name: "Test", slug: "test", icon: "Star" });
    expect(instance.embedding).toEqual([]);
  });

  it("has sourcePrompt field as String defaulting to empty string", () => {
    const schemaPaths = SectionTemplate.schema.paths;
    expect(schemaPaths["sourcePrompt"]).toBeDefined();
    const instance = new SectionTemplate({ name: "Test", slug: "test", icon: "Star" });
    expect(instance.sourcePrompt).toBe("");
  });

  it("has forkedFrom field as ObjectId ref to SectionTemplate defaulting to null", () => {
    const schemaPaths = SectionTemplate.schema.paths;
    expect(schemaPaths["forkedFrom"]).toBeDefined();
    expect((schemaPaths["forkedFrom"] as mongoose.Schema.Types.ObjectId & { options: { ref?: string } }).options.ref).toBe("SectionTemplate");
    const instance = new SectionTemplate({ name: "Test", slug: "test", icon: "Star" });
    expect(instance.forkedFrom).toBeNull();
  });

  it("has forkCount field as Number defaulting to 0", () => {
    const schemaPaths = SectionTemplate.schema.paths;
    expect(schemaPaths["forkCount"]).toBeDefined();
    const instance = new SectionTemplate({ name: "Test", slug: "test", icon: "Star" });
    expect(instance.forkCount).toBe(0);
  });

  it("has isShared field as Boolean defaulting to true", () => {
    const schemaPaths = SectionTemplate.schema.paths;
    expect(schemaPaths["isShared"]).toBeDefined();
    const instance = new SectionTemplate({ name: "Test", slug: "test", icon: "Star" });
    expect(instance.isShared).toBe(true);
  });

  it("has isShared + usageCount compound index defined", () => {
    const indexes = SectionTemplate.schema.indexes();
    const hasIndex = indexes.some(
      ([fields]) =>
        "isShared" in fields && "usageCount" in fields
    );
    expect(hasIndex).toBe(true);
  });
});
