import { describe, it, expect, afterEach } from "vitest";
import { BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { en as coreEn } from "@blocknote/core/locales";
import { withMultiColumn, locales as multiColumnLocales } from "@blocknote/xl-multi-column";
import { CalloutBlock } from "@/components/notes/blocks/callout-block";
import { DividerBlock } from "@/components/notes/blocks/divider-block";
import { TableOfContentsBlock } from "@/components/notes/blocks/toc-block";
import { TEMPLATES, buildTemplate } from "@/lib/notes/templates";

// Mirror the block types the templates actually seed (default blocks + our customs).
const schema = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      callout: CalloutBlock(),
      divider: DividerBlock(),
      tableOfContents: TableOfContentsBlock(),
    },
  })
);

const editors: BlockNoteEditor[] = [];
afterEach(() => { editors.forEach((e) => e._tiptapEditor?.destroy?.()); editors.length = 0; });

describe("templates load into a BlockNote editor without breaking", () => {
  for (const t of TEMPLATES) {
    it(`"${t.key}" parses into a valid, non-empty document`, () => {
      const editor = BlockNoteEditor.create({
        schema,
        initialContent: buildTemplate(t.key) as never,
        dictionary: { ...coreEn, multi_column: multiColumnLocales.en },
      });
      editors.push(editor);
      expect(editor.document.length).toBeGreaterThan(0);
    });
  }
});
