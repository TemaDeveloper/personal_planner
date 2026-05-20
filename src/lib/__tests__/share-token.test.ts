import { describe, it, expect } from "vitest";
import { shareTokenCreateSchema } from "@/lib/models/share-token";

describe("shareTokenCreateSchema", () => {
  it("accepts valid share with all fields", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "work",
      scopeFilter: "Advapay",
      inviteeEmail: "boss@example.com",
      label: "For my manager",
      expiresAt: "2026-12-31T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal share (magic link, no email)", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "gym",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sectionType", () => {
    const result = shareTokenCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "work",
      inviteeEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts custom section type", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "custom:tire-reselling",
    });
    expect(result.success).toBe(true);
  });
});
