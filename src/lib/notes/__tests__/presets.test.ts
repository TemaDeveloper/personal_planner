import { describe, it, expect } from "vitest";
import { PRESETS, buildPreset } from "@/lib/notes/presets";
import type { PresetKey } from "@/lib/notes/types";

describe("presets", () => {
  it("registry lists all five presets with labels", () => {
    const keys = PRESETS.map((p) => p.key).sort();
    expect(keys).toEqual(["blank", "journal", "meeting", "project", "todo"]);
    expect(PRESETS.every((p) => p.label.length > 0)).toBe(true);
  });
  it("blank returns a single empty paragraph", () => {
    const blocks = buildPreset("blank");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
  });
  it("todo seeds checkbox blocks", () => {
    const blocks = buildPreset("todo");
    expect(blocks.some((b) => b.type === "checkListItem")).toBe(true);
  });
  it("every preset returns at least one block", () => {
    (["blank", "todo", "meeting", "journal", "project"] as PresetKey[]).forEach((k) => {
      expect(buildPreset(k).length).toBeGreaterThan(0);
    });
  });
});
