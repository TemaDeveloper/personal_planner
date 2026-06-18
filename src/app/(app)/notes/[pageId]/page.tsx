"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { NotesEditorLoader } from "@/components/notes/notes-editor-loader";
import { useNotesRefresh } from "@/components/notes/notes-screen";
import { EmojiPickerButton } from "@/components/notes/emoji-picker-button";
import { PageCover } from "@/components/notes/page-cover";

type Loaded = { id: string; title: string; icon: string; content: unknown; coverUrl: string | null };

export default function NotesPageView() {
  const { pageId } = useParams<{ pageId: string }>();
  const refresh = useNotesRefresh();
  const [page, setPage] = useState<Loaded | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPage(null); setNotFound(false); // eslint-disable-line react-hooks/set-state-in-effect -- reset on page switch
    fetch(`/api/notes/${pageId}`).then(async (r) => {
      if (!r.ok) { setNotFound(true); return; }
      setPage((await r.json()).page);
    });
  }, [pageId]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/notes/${pageId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { toast.error("Failed to save changes"); return; }
    refresh();
  };

  if (notFound) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Page not found.</div>;
  if (!page) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Loading…</div>;

  return (
    <div className="notes-page w-full px-6 md:px-14 lg:px-20 py-8">
      <PageCover
        coverUrl={page.coverUrl}
        onChange={(url) => { setPage({ ...page, coverUrl: url }); patch({ coverUrl: url }); }}
      />
      <div className="mt-3">
        <EmojiPickerButton value={page.icon} onPick={(emoji) => { setPage({ ...page, icon: emoji }); patch({ icon: emoji }); }} />
      </div>
      <input aria-label="Page title" defaultValue={page.title} placeholder="Untitled"
        onBlur={(e) => patch({ title: e.target.value })}
        className="block w-full text-3xl font-bold bg-transparent outline-none mt-2 mb-6"
        style={{ color: "var(--text-primary)" }} />
      <NotesEditorLoader pageId={page.id} initialContent={page.content} />
    </div>
  );
}
