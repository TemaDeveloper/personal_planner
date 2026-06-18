"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { NotesEditorLoader } from "@/components/notes/notes-editor-loader";
import { useNotesRefresh } from "@/components/notes/notes-screen";
import { EmojiPickerButton } from "@/components/notes/emoji-picker-button";
import { PageCover } from "@/components/notes/page-cover";
import { Breadcrumbs } from "@/components/notes/breadcrumbs";
import { PageOptionsMenu } from "@/components/notes/page-options-menu";
import { relativeTime } from "@/lib/notes/relative-time";
import { blocksToMarkdown } from "@/lib/notes/blocks-to-markdown";

type Loaded = { id: string; title: string; icon: string; content: unknown; coverUrl: string | null; fullWidth: boolean; pinned: boolean; updatedAt: string | null };

export default function NotesPageView() {
  const { pageId } = useParams<{ pageId: string }>();
  const router = useRouter();
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

  const remove = async () => {
    const res = await fetch(`/api/notes/${pageId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete page"); return; }
    refresh();
    router.push("/notes");
  };

  const toggleFavorite = () => {
    if (!page) return;
    const pinned = !page.pinned;
    setPage({ ...page, pinned });
    patch({ pinned });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/notes/${pageId}`);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const duplicate = async () => {
    const res = await fetch(`/api/notes/${pageId}/duplicate`, { method: "POST" });
    if (!res.ok) { toast.error("Failed to duplicate page"); return; }
    const { page: dup } = await res.json();
    refresh();
    router.push(`/notes/${dup.id}`);
  };

  const exportMarkdown = () => {
    if (!page) return;
    const title = page.title || "Untitled";
    const body = blocksToMarkdown(page.content);
    const md = `# ${title}\n\n${body}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (notFound) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Page not found.</div>;
  if (!page) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Loading…</div>;

  const widthClass = page.fullWidth ? "w-full px-6 md:px-14 lg:px-20" : "max-w-[900px] mx-auto px-6 md:px-10";

  return (
    <div className={`notes-page ${widthClass} py-8`}>
      <div className="flex items-center gap-2 min-h-8">
        <div className="flex-1 min-w-0">
          <Breadcrumbs pageId={page.id} />
        </div>
        {page.updatedAt && (
          <span className="text-[12px] hidden sm:inline whitespace-nowrap" style={{ color: "var(--text-faint)" }}>
            Edited {relativeTime(page.updatedAt)}
          </span>
        )}
        <button type="button" aria-label={page.pinned ? "Remove from favorites" : "Add to favorites"}
          onClick={toggleFavorite}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-raised)] transition-colors"
          style={{ color: page.pinned ? "var(--accent-color)" : "var(--text-muted)" }}>
          <Star size={17} fill={page.pinned ? "currentColor" : "none"} />
        </button>
        <PageOptionsMenu
          fullWidth={page.fullWidth}
          pinned={page.pinned}
          onToggleFullWidth={() => { const fw = !page.fullWidth; setPage({ ...page, fullWidth: fw }); patch({ fullWidth: fw }); }}
          onToggleFavorite={toggleFavorite}
          onCopyLink={copyLink}
          onDuplicate={duplicate}
          onExport={exportMarkdown}
          onDelete={remove}
        />
      </div>
      <div className="group/header">
        {/* Cover banner (only when set) */}
        {page.coverUrl && (
          <PageCover
            coverUrl={page.coverUrl}
            onChange={(url) => { setPage({ ...page, coverUrl: url }); patch({ coverUrl: url }); }}
          />
        )}
        {/* Icon — overlaps the cover's bottom edge when a cover is present (Notion look). */}
        <div className={page.coverUrl ? "-mt-10 relative z-10" : "mt-3"}>
          <EmojiPickerButton
            value={page.icon}
            onPick={(emoji) => { setPage({ ...page, icon: emoji }); patch({ icon: emoji }); }}
            buttonClassName="text-[64px] leading-none hover:bg-[var(--surface-raised)] rounded-md px-1"
          />
        </div>
        {/* Hover affordance: Add cover (when none yet) */}
        {!page.coverUrl && (
          <div className="opacity-0 group-hover/header:opacity-100 transition-opacity mt-1">
            <PageCover
              coverUrl={null}
              onChange={(url) => { setPage({ ...page, coverUrl: url }); patch({ coverUrl: url }); }}
            />
          </div>
        )}
        <input aria-label="Page title" defaultValue={page.title} placeholder="Untitled"
          onBlur={(e) => patch({ title: e.target.value })}
          className="block w-full text-[2.5rem] leading-tight font-bold bg-transparent outline-none mt-2 mb-6"
          style={{ color: "var(--text-primary)" }} />
      </div>
      <NotesEditorLoader pageId={page.id} initialContent={page.content} />
    </div>
  );
}
