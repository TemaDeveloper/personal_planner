import { describe, it, expect, afterEach } from "vitest";
import { BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { en as coreEn } from "@blocknote/core/locales";
import { withMultiColumn, getMultiColumnSlashMenuItems, locales as multiColumnLocales } from "@blocknote/xl-multi-column";

const schema = withMultiColumn(BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs } }));
const editors: BlockNoteEditor[] = [];
afterEach(() => { editors.forEach((e) => e._tiptapEditor?.destroy?.()); editors.length = 0; });

describe("multi-column slash menu dictionary", () => {
  it("throws without the multi_column dictionary (reproduces the perpetual-loading slash menu)", () => {
    const editor = BlockNoteEditor.create({ schema });
    editors.push(editor);
    expect(() => getMultiColumnSlashMenuItems(editor)).toThrow();
  });

  it("returns the column slash items when the multi_column dictionary is provided (the fix)", () => {
    const editor = BlockNoteEditor.create({ schema, dictionary: { ...coreEn, multi_column: multiColumnLocales.en } });
    editors.push(editor);
    const items = getMultiColumnSlashMenuItems(editor);
    expect(items.length).toBeGreaterThan(0);
  });
});
