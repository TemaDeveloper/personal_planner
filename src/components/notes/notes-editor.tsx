"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from "@blocknote/react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { withMultiColumn, multiColumnDropCursor, getMultiColumnSlashMenuItems } from "@blocknote/xl-multi-column";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useDebouncedSave } from "@/hooks/use-debounced-save";
import { useNotesRefresh } from "@/components/notes/notes-screen";
import { SubPageBlock } from "@/components/notes/blocks/sub-page-block";
import { CalloutBlock } from "@/components/notes/blocks/callout-block";
import { DividerBlock } from "@/components/notes/blocks/divider-block";
import { TableOfContentsBlock } from "@/components/notes/blocks/toc-block";
import { BookmarkBlock } from "@/components/notes/blocks/bookmark-block";
import { EquationBlock } from "@/components/notes/blocks/equation-block";

const schema = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      subPage: SubPageBlock(),
      callout: CalloutBlock(),
      divider: DividerBlock(),
      tableOfContents: TableOfContentsBlock(),
      bookmark: BookmarkBlock(),
      equation: EquationBlock(),
    },
  })
);

/** Reads the app's dark-mode state (Tailwind `dark` class on <html>). */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function NotesEditor({ pageId, initialContent }: { pageId: string; initialContent: unknown }) {
  const isDark = useIsDark();
  const refresh = useNotesRefresh();
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const uploadFile = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/notes/upload", { method: "POST", body });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.url as string;
  };

  const initial = useMemo(() => {
    const c = initialContent;
    return Array.isArray(c) && c.length > 0 ? (c as never) : undefined;
  }, [initialContent]);

  const editor = useCreateBlockNote({ schema, initialContent: initial, uploadFile, dropCursor: multiColumnDropCursor });

  const insertSubPageItem = () => ({
    title: "Page",
    subtext: "Create a sub-page",
    aliases: ["page", "subpage", "child"],
    group: "Basic",
    onItemClick: async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: pageId, template: "blank" }),
      });
      if (!res.ok) return;
      const { page } = await res.json();
      insertOrUpdateBlockForSlashMenu(editor, { type: "subPage", props: { pageId: page.id } });
      refresh();
    },
  });

  const persist = useRef<(content: unknown) => Promise<void>>(async () => {});
  useLayoutEffect(() => {
    persist.current = async (content: unknown) => {
      setStatus("saving");
      await fetch(`/api/notes/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setStatus("saved");
    };
  });

  const debouncedSave = useDebouncedSave<unknown>((c) => persist.current(c), 600);

  return (
    <div className="relative">
      <div className="absolute right-2 -top-6 text-[11px]" style={{ color: "var(--text-faint)" }}>
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
      </div>
      <BlockNoteView
        editor={editor}
        theme={isDark ? "dark" : "light"}
        slashMenu={false}
        onChange={() => debouncedSave(editor.document)}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                ...getMultiColumnSlashMenuItems(editor),
                insertSubPageItem(),
                {
                  title: "Callout",
                  subtext: "Highlighted info box",
                  aliases: ["callout", "note", "info", "tip"],
                  group: "Basic blocks",
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout" }),
                },
                {
                  title: "Divider",
                  subtext: "Visual separator",
                  aliases: ["divider", "hr", "line", "rule"],
                  group: "Basic blocks",
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "divider" }),
                },
                {
                  title: "Table of contents",
                  subtext: "Live outline of the page's headings",
                  aliases: ["toc", "table of contents", "outline"],
                  group: "Advanced",
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "tableOfContents" }),
                },
                {
                  title: "Web bookmark",
                  subtext: "Save a link as a visual preview card",
                  aliases: ["bookmark", "link", "embed", "url"],
                  group: "Media",
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "bookmark" }),
                },
                {
                  title: "Equation",
                  subtext: "Block math with LaTeX (KaTeX)",
                  aliases: ["math", "equation", "latex", "katex", "tex"],
                  group: "Advanced",
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "equation" }),
                },
              ],
              query
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
