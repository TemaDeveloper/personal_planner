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
  defaultInlineContentSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  createCodeBlockSpec,
} from "@blocknote/core";
import { en as coreEn } from "@blocknote/core/locales";
import { codeBlockOptions } from "@blocknote/code-block";
import { BlockNoteView } from "@blocknote/mantine";
import { withMultiColumn, multiColumnDropCursor, getMultiColumnSlashMenuItems, locales as multiColumnLocales } from "@blocknote/xl-multi-column";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useDebouncedSave } from "@/hooks/use-debounced-save";
import { useNotesRefresh, useNotesPages } from "@/components/notes/notes-screen";
import { searchPages } from "@/lib/notes/search-pages";
import { isBareUrl } from "@/lib/notes/is-bare-url";
import { detectLanguage } from "@/lib/notes/detect-language";
import { SubPageBlock } from "@/components/notes/blocks/sub-page-block";
import { CalloutBlock } from "@/components/notes/blocks/callout-block";
import { DividerBlock } from "@/components/notes/blocks/divider-block";
import { TableOfContentsBlock } from "@/components/notes/blocks/toc-block";
import { BookmarkBlock } from "@/components/notes/blocks/bookmark-block";
import { EquationBlock } from "@/components/notes/blocks/equation-block";
import { MentionInline } from "@/components/notes/blocks/mention-inline";
import { DatabaseBlock } from "@/components/notes/blocks/database-block";
import { ButtonBlock } from "@/components/notes/blocks/button-block";
import { FileText, Info, Minus, ChevronRight, List, Bookmark, Sigma, Table2, MousePointerClick } from "lucide-react";

const schema = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      // Syntax highlighting only attaches when the code-block SPEC carries the
      // Shiki highlighter — the plain defaultBlockSpecs.codeBlock does not, so a
      // custom schema must build it explicitly (passing `codeBlock` as an editor
      // option is NOT enough when you supply your own schema). defaultLanguage
      // "text" so new/pasted code starts plain and auto-detection sets the lang.
      codeBlock: createCodeBlockSpec({ ...codeBlockOptions, defaultLanguage: "text" }),
      subPage: SubPageBlock(),
      callout: CalloutBlock(),
      divider: DividerBlock(),
      tableOfContents: TableOfContentsBlock(),
      bookmark: BookmarkBlock(),
      equation: EquationBlock(),
      database: DatabaseBlock(),
      button: ButtonBlock(),
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      mention: MentionInline,
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

export function NotesEditor({ pageId, initialContent, onPersist }: {
  pageId?: string; initialContent: unknown; onPersist?: (content: unknown) => Promise<void>;
}) {
  const isDark = useIsDark();
  const refresh = useNotesRefresh();
  const pages = useNotesPages();
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

  // The multi-column extension reads its slash-menu labels from
  // `dictionary.multi_column`; without it getMultiColumnSlashMenuItems throws,
  // which would make the "/" menu hang on "Loading…" forever.
  const editor = useCreateBlockNote({
    schema,
    initialContent: initial,
    uploadFile,
    dropCursor: multiColumnDropCursor,
    dictionary: {
      ...coreEn,
      placeholders: { ...coreEn.placeholders, default: "Write something, or press '/' for commands" },
      multi_column: multiColumnLocales.en,
    },
    // Syntax highlighting is configured on the codeBlock SPEC in `schema` above
    // (createCodeBlockSpec), so no `codeBlock` editor option is needed here.
    // Paste-smart: a bare URL pasted onto an empty line becomes a bookmark card.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pasteHandler: ({ event, editor: ed, defaultPasteHandler }: any) => {
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (isBareUrl(text)) {
        const pos = ed.getTextCursorPosition();
        const cur = pos.block;
        const empty = cur.type === "paragraph" && (!cur.content || cur.content.length === 0);
        if (empty) ed.updateBlock(cur, { type: "bookmark", props: { url: text.trim() } });
        else ed.insertBlocks([{ type: "bookmark", props: { url: text.trim() } }], cur, "after");
        return true;
      }
      return defaultPasteHandler();
    },
  });

  // Auto-detect the language of code blocks from their content. Runs once per
  // block (autodetected set), only while the language is still the "text"
  // default, so it never fights an explicit choice or loops.
  const autodetected = useRef<Set<string>>(new Set());
  const autodetectCode = () => {
    const all: { id: string; type: string; props: Record<string, unknown>; content: unknown }[] = [];
    const walk = (blocks: typeof all) => {
      for (const b of blocks) {
        all.push(b);
        const kids = (b as { children?: typeof all }).children;
        if (Array.isArray(kids)) walk(kids);
      }
    };
    walk(editor.document as unknown as typeof all);
    for (const block of all) {
      if (block.type !== "codeBlock" || autodetected.current.has(block.id)) continue;
      const lang = block.props?.language as string | undefined;
      if (lang && lang !== "text") continue;
      const text = Array.isArray(block.content)
        ? (block.content as unknown[])
            .map((n) => (n && typeof n === "object" && "text" in n ? String((n as { text?: unknown }).text ?? "") : ""))
            .join("")
        : "";
      if (text.trim().length < 12) continue;
      const guess = detectLanguage(text);
      if (guess && guess !== lang) {
        autodetected.current.add(block.id);
        editor.updateBlock(block.id, { props: { language: guess } });
      }
    }
  };

  // Light up code blocks on initial load too: a page may have code saved as
  // "text" (e.g. created before detection, or pasted then navigated away);
  // Notion shows the language immediately, so detect once after mount.
  useEffect(() => {
    const t = setTimeout(autodetectCode, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; editor is stable
  }, []);

  const insertSubPageItem = () => ({
    title: "Page",
    subtext: "Create a sub-page",
    aliases: ["page", "subpage", "child"],
    group: "Basic",
    icon: <FileText size={18} />,
    onItemClick: async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: pageId ?? null, template: "blank" }),
      });
      if (!res.ok) return;
      const { page } = await res.json();
      insertOrUpdateBlockForSlashMenu(editor, { type: "subPage", props: { pageId: page.id } });
      refresh();
    },
  });

  const insertDatabaseItem = () => ({
    title: "Database",
    subtext: "Table, board, gallery or list of records",
    aliases: ["database", "db", "table", "board", "gallery", "collection"],
    group: "Advanced",
    icon: <Table2 size={18} />,
    onItemClick: async () => {
      const res = await fetch("/api/notes/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (!res.ok) return;
      const { database } = await res.json();
      insertOrUpdateBlockForSlashMenu(editor, { type: "database", props: { databaseId: database.id } });
    },
  });

  const persist = useRef<(content: unknown) => Promise<void>>(async () => {});
  useLayoutEffect(() => {
    persist.current = async (content: unknown) => {
      setStatus("saving");
      // onPersist lets the same editor save anywhere (e.g. a database row body);
      // default is the notes-page PATCH.
      if (onPersist) {
        await onPersist(content);
      } else if (pageId) {
        await fetch(`/api/notes/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      }
      setStatus("saved");
    };
  });

  const debouncedSave = useDebouncedSave<unknown>((c) => persist.current(c), 600);

  // Flush the latest content on unmount. The editor is keyed per page, so it
  // unmounts when navigating away — without this, edits made in the last 600ms
  // (still sitting in the debounce) would be dropped. pageId/editor are this
  // instance's, so the flush always targets the correct (departing) page.
  useEffect(() => {
    return () => { void persist.current(editor.document); };
  }, [editor]);

  return (
    <div className="relative">
      <div className="absolute right-2 -top-6 text-[11px]" style={{ color: "var(--text-faint)" }}>
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
      </div>
      <BlockNoteView
        editor={editor}
        theme={isDark ? "dark" : "light"}
        slashMenu={false}
        onChange={() => { debouncedSave(editor.document); queueMicrotask(autodetectCode); }}
      >
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) =>
            searchPages(pages, query).slice(0, 10).map((p) => ({
              title: `${p.icon} ${p.title || "Untitled"}`,
              onItemClick: () =>
                editor.insertInlineContent([
                  { type: "mention", props: { pageId: p.id, label: p.title || "Untitled" } },
                  " ",
                ]),
            }))
          }
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                // Guard: never let a throwing sub-source hang the menu on "Loading…".
                ...(() => { try { return getMultiColumnSlashMenuItems(editor); } catch { return []; } })(),
                insertSubPageItem(),
                insertDatabaseItem(),
                {
                  title: "Button",
                  subtext: "A clickable label that can open a link",
                  aliases: ["button", "cta", "action"],
                  group: "Basic blocks",
                  icon: <MousePointerClick size={18} />,
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "button" }),
                },
                {
                  title: "Callout",
                  subtext: "Highlighted info box",
                  aliases: ["callout", "note", "info", "tip"],
                  group: "Basic blocks",
                  icon: <Info size={18} />,
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout" }),
                },
                {
                  title: "Divider",
                  subtext: "Visual separator",
                  aliases: ["divider", "hr", "line", "rule"],
                  group: "Basic blocks",
                  icon: <Minus size={18} />,
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "divider" }),
                },
                {
                  title: "Toggle heading",
                  subtext: "Collapsible heading section",
                  aliases: ["toggle heading", "collapsible heading", "toggleh"],
                  group: "Headings",
                  icon: <ChevronRight size={18} />,
                  onItemClick: () =>
                    insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level: 1, isToggleable: true } }),
                },
                {
                  title: "Table of contents",
                  subtext: "Live outline of the page's headings",
                  aliases: ["toc", "table of contents", "outline"],
                  group: "Advanced",
                  icon: <List size={18} />,
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "tableOfContents" }),
                },
                {
                  title: "Web bookmark",
                  subtext: "Save a link as a visual preview card",
                  aliases: ["bookmark", "link", "embed", "url"],
                  group: "Media",
                  icon: <Bookmark size={18} />,
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "bookmark" }),
                },
                {
                  title: "Equation",
                  subtext: "Block math with LaTeX (KaTeX)",
                  aliases: ["math", "equation", "latex", "katex", "tex"],
                  group: "Advanced",
                  icon: <Sigma size={18} />,
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
