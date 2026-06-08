import { describe, it, expect } from "vitest";
import { calendarSlugFor } from "../calendar-section";

describe("calendarSlugFor", () => {
  it("builds a stable per-user slug", () => {
    expect(calendarSlugFor("507f1f77bcf86cd799439011")).toBe(
      "calendar-507f1f77bcf86cd799439011"
    );
  });

  it("lowercases the id so it matches the lowercased slug field", () => {
    expect(calendarSlugFor("ABC123")).toBe("calendar-abc123");
  });

  it("accepts ObjectId-like values via toString()", () => {
    const objectIdLike = { toString: () => "507F1F77BCF86CD799439011" };
    expect(calendarSlugFor(objectIdLike as unknown as string)).toBe(
      "calendar-507f1f77bcf86cd799439011"
    );
  });

  it("is deterministic for the same id", () => {
    expect(calendarSlugFor("aaa")).toBe(calendarSlugFor("aaa"));
  });
});
