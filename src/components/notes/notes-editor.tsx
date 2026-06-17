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
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useDebouncedSave } from "@/hooks/use-debounced-save";
import { useNotesRefresh } from "@/components/notes/notes-screen";
import { SubPageBlock } from "@/components/notes/blocks/sub-page-block";

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, subPage: SubPageBlock() },
});

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

  const editor = useCreateBlockNote({ schema, initialContent: initial, uploadFile });

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
              [...getDefaultReactSlashMenuItems(editor), insertSubPageItem()],
              query
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
