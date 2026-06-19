"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useNotesPages } from "@/components/notes/notes-screen";

/** A block that links to a child page, rendered as a Notion-style full-width
 * tinted row (icon + title). `color` reuses the callout tint palette. */
export const SubPageBlock = createReactBlockSpec(
  {
    type: "subPage",
    propSchema: { pageId: { default: "" }, color: { default: "default" } },
    content: "none",
  },
  {
    render: (props) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const pages = useNotesPages();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const router = useRouter();
      const pageId = props.block.props.pageId;
      const color = props.block.props.color as string;
      const child = pages.find((p) => p.id === pageId);

      if (!child) {
        return (
          <div className="flex items-center gap-2 my-1 px-3 py-2 rounded-md text-[15px]" data-callout-color={color}
            style={{ color: "var(--text-faint)" }} contentEditable={false}>
            <FileText size={16} /> <span>Untitled (deleted)</span>
          </div>
        );
      }
      return (
        <div
          contentEditable={false}
          onClick={() => router.push(`/notes/${child.id}`)}
          data-callout-color={color}
          className="flex items-center gap-2 my-1 px-3 py-2 rounded-md cursor-pointer text-[15px] font-medium transition-[filter] hover:brightness-95"
          style={{ color: "var(--text-primary)" }}
        >
          <span className="text-[18px] leading-none">{child.icon}</span>
          <span className="truncate">{child.title || "Untitled"}</span>
        </div>
      );
    },
  }
);
