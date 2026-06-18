"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { useRouter } from "next/navigation";
import { useNotesPages } from "@/components/notes/notes-screen";

function MentionView({ pageId, label }: { pageId: string; label: string }) {
  const pages = useNotesPages();
  const router = useRouter();
  const page = pages.find((p) => p.id === pageId);
  const title = page ? page.title || "Untitled" : label || "Untitled";
  const icon = page?.icon ?? "📄";
  return (
    <span
      contentEditable={false}
      onClick={() => router.push(`/notes/${pageId}`)}
      className="inline-flex items-center gap-0.5 px-1 rounded cursor-pointer hover:bg-[var(--surface-raised)]"
      style={{ color: "var(--accent-color)" }}
    >
      <span>{icon}</span>
      <span className="underline underline-offset-2">{title}</span>
    </span>
  );
}

/** A live inline mention/link to another page; reflects the page's current icon + title. */
export const MentionInline = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: { pageId: { default: "" }, label: { default: "" } },
    content: "none",
  },
  {
    render: (props) => (
      <MentionView pageId={props.inlineContent.props.pageId} label={props.inlineContent.props.label} />
    ),
  }
);
