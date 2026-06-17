import { describe, it, expect } from "vitest";
import { notesPageCreateSchema, notesPageUpdateSchema } from "@/lib/validations";

describe("notes validations", () => {
  it("accepts a create with a preset", () => {
    expect(notesPageCreateSchema.safeParse({ preset: "todo", parentId: null }).success).toBe(true);
  });
  it("rejects a non-string template", () => {
    expect(notesPageCreateSchema.safeParse({ template: 123 }).success).toBe(false);
  });
  it("accepts a partial update (content only)", () => {
    expect(notesPageUpdateSchema.safeParse({ content: [{ type: "paragraph" }] }).success).toBe(true);
  });
  it("rejects a title over the cap", () => {
    expect(notesPageUpdateSchema.safeParse({ title: "x".repeat(300) }).success).toBe(false);
  });
});

import { describe as describe2, it as it2, expect as expect2 } from "vitest";
import { notesPageCreateSchema as createV2, notesPageUpdateSchema as updateV2 } from "@/lib/validations";

describe2("notes v2 validations", () => {
  it2("create accepts a template key string", () => {
    expect2(createV2.safeParse({ template: "study-planner" }).success).toBe(true);
  });
  it2("update accepts a coverUrl (relative path), absolute URL, and null", () => {
    expect2(updateV2.safeParse({ coverUrl: "/api/notes/blob?pathname=notes%2Fabc%2Fx.png" }).success).toBe(true);
    expect2(updateV2.safeParse({ coverUrl: "https://example.com/x.png" }).success).toBe(true);
    expect2(updateV2.safeParse({ coverUrl: null }).success).toBe(true);
  });
  it2("update rejects a coverUrl over the cap", () => {
    expect2(updateV2.safeParse({ coverUrl: "x".repeat(1001) }).success).toBe(false);
  });
});
