"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NotesEditorLoader } from "@/components/notes/notes-editor-loader";
import { useNotesRefresh } from "@/components/notes/notes-screen";

type Loaded = { id: string; title: string; icon: string; content: unknown };

export default function NotesPageView() {
  const { pageId } = useParams<{ pageId: string }>();
  const refresh = useNotesRefresh();
  const [page, setPage] = useState<Loaded | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPage(null); setNotFound(false); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch
    fetch(`/api/notes/${pageId}`).then(async (r) => {
      if (!r.ok) { setNotFound(true); return; }
      setPage((await r.json()).page);
    });
  }, [pageId]);

  const saveMeta = async (patch: { title?: string; icon?: string }) => {
    await fetch(`/api/notes/${pageId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    refresh();
  };

  if (notFound) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Page not found.</div>;
  if (!page) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-8">
      <input aria-label="Page icon" defaultValue={page.icon}
        onBlur={(e) => saveMeta({ icon: e.target.value || "📄" })}
        className="text-4xl bg-transparent outline-none w-14" maxLength={8} />
      <input aria-label="Page title" defaultValue={page.title} placeholder="Untitled"
        onBlur={(e) => saveMeta({ title: e.target.value })}
        className="block w-full text-3xl font-bold bg-transparent outline-none mt-2 mb-6"
        style={{ color: "var(--text-primary)" }} />
      <NotesEditorLoader pageId={page.id} initialContent={page.content} />
    </div>
  );
}
