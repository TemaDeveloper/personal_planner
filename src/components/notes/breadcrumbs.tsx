"use client";

import Link from "next/link";
import { useNotesPages } from "@/components/notes/notes-screen";
import { pageAncestors } from "@/lib/notes/breadcrumbs";

/** Notion-style ancestor path for the current page. */
export function Breadcrumbs({ pageId }: { pageId: string }) {
  const pages = useNotesPages();
  const chain = pageAncestors(pages, pageId);
  if (chain.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-[12px] mb-2" style={{ color: "var(--text-faint)" }}>
      {chain.map((node, i) => {
        const last = i === chain.length - 1;
        return (
          <span key={node.id} className="flex items-center gap-1 min-w-0">
            {last ? (
              <span className="truncate" style={{ color: "var(--text-muted)" }}>{node.icon} {node.title || "Untitled"}</span>
            ) : (
              <>
                <Link href={`/notes/${node.id}`} className="truncate hover:underline">{node.icon} {node.title || "Untitled"}</Link>
                <span aria-hidden>/</span>
              </>
            )}
          </span>
        );
      })}
    </nav>
  );
}
