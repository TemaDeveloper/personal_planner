import { describe, it, expect } from "vitest";
import { TEMPLATES, TEMPLATE_CATEGORIES, buildTemplate, templateDatabases, type PresetBlock } from "@/lib/notes/templates";

/** Collect every database-block sentinel id in a template's content (incl. nested). */
function dbSentinels(blocks: PresetBlock[]): string[] {
  const out: string[] = [];
  const walk = (bs: PresetBlock[]) => {
    for (const b of bs) {
      if (b.type === "database" && typeof b.props?.databaseId === "string") out.push(b.props.databaseId as string);
      if (b.children) walk(b.children);
    }
  };
  walk(blocks);
  return out;
}

describe("templates", () => {
  it("lists all 5 categories in order", () => {
    expect(TEMPLATE_CATEGORIES).toEqual(["Basic", "Students", "Hobbies", "Work & Productivity", "Personal & Health"]);
  });
  it("every template has key/label/description/icon and a build()", () => {
    for (const t of TEMPLATES) {
      expect(t.key.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(TEMPLATE_CATEGORIES).toContain(t.category);
    }
  });
  it("every template builds at least one block", () => {
    for (const t of TEMPLATES) expect(buildTemplate(t.key).length).toBeGreaterThan(0);
  });
  it("includes the five Basic presets", () => {
    const basic = TEMPLATES.filter((t) => t.category === "Basic").map((t) => t.key).sort();
    expect(basic).toEqual(["blank", "journal", "meeting", "project", "todo"]);
  });
  it("unknown key falls back to a single blank paragraph", () => {
    const blocks = buildTemplate("does-not-exist");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
  });
  it("keys are unique", () => {
    const keys = TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("non-blank templates are rich (multi-section, with callouts/dividers)", () => {
    for (const t of TEMPLATES) {
      if (t.key === "blank") continue;
      const blocks = buildTemplate(t.key);
      const types = new Set(blocks.map((b) => b.type));
      // Database-backed templates are intentionally short — the database itself
      // is the content — so they're exempt from the block-count/divider rule.
      if (t.database) {
        expect(types.has("database"), `${t.key} embeds its database`).toBe(true);
        continue;
      }
      expect(blocks.length, t.key).toBeGreaterThanOrEqual(6);
      expect(types.has("heading"), `${t.key} has headings`).toBe(true);
      expect(types.has("callout") || types.has("divider"), `${t.key} uses callout/divider`).toBe(true);
    }
  });
  it("callout blocks carry an emoji prop", () => {
    const callouts = buildTemplate("meeting").filter((b) => b.type === "callout");
    expect(callouts.length).toBeGreaterThan(0);
    expect(typeof callouts[0].props?.emoji).toBe("string");
  });

  it("every database-block placeholder has a matching database definition (and vice versa)", () => {
    for (const t of TEMPLATES) {
      const sentinels = dbSentinels(buildTemplate(t.key));
      const defs = templateDatabases(t.key);
      const defKeys = Object.keys(defs);
      // every dbBlock(sentinel) in the content must have a database def...
      for (const s of sentinels) {
        expect(defKeys, `${t.key}: dbBlock "${s}" has no database definition`).toContain(s);
      }
      // ...and every defined database must be placed by a dbBlock.
      for (const k of defKeys) {
        expect(sentinels, `${t.key}: database "${k}" is defined but never placed`).toContain(k);
      }
    }
  });

  it("database-template definitions are internally valid (title prop + ≥1 view)", () => {
    for (const t of TEMPLATES) {
      for (const [, def] of Object.entries(templateDatabases(t.key))) {
        expect(def.properties.some((p) => p.type === "title"), `${t.key} db needs a title property`).toBe(true);
        expect(def.views.length, `${t.key} db needs a view`).toBeGreaterThan(0);
        // board views must group by a real property id
        for (const v of def.views) {
          if (v.type === "board" && v.groupBy) {
            expect(def.properties.some((p) => p.id === v.groupBy), `${t.key} board groupBy must be a real prop`).toBe(true);
          }
        }
      }
    }
  });
});
