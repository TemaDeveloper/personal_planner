import { describe, it, expect } from "vitest";
import { notesPageCreateSchema, notesPageUpdateSchema } from "@/lib/validations";

describe("notes validations", () => {
  it("accepts a create with a preset", () => {
    expect(notesPageCreateSchema.safeParse({ preset: "todo", parentId: null }).success).toBe(true);
  });
  it("rejects an unknown preset", () => {
    expect(notesPageCreateSchema.safeParse({ preset: "nope" }).success).toBe(false);
  });
  it("accepts a partial update (content only)", () => {
    expect(notesPageUpdateSchema.safeParse({ content: [{ type: "paragraph" }] }).success).toBe(true);
  });
  it("rejects a title over the cap", () => {
    expect(notesPageUpdateSchema.safeParse({ title: "x".repeat(300) }).success).toBe(false);
  });
});
