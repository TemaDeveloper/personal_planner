import { describe, it, expect } from "vitest";
import { TIME_LABEL_WIDTH, gridTemplate } from "@/lib/calendar-layout";

describe("calendar grid layout", () => {
  it("label column is 56px", () => {
    expect(TIME_LABEL_WIDTH).toBe(56);
  });
  it("builds a template with the label column plus N equal day columns", () => {
    expect(gridTemplate(7)).toBe("56px repeat(7, minmax(0, 1fr))");
    expect(gridTemplate(1)).toBe("56px repeat(1, minmax(0, 1fr))");
  });
});
