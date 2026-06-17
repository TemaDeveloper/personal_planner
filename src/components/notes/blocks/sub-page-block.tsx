"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useNotesPages } from "@/components/notes/notes-screen";

/** A block that links to a child page, showing its live icon + title. */
export const SubPageBlock = createReactBlockSpec(
  {
    type: "subPage",
    propSchema: { pageId: { default: "" } },
    content: "none",
  },
  {
    render: (props) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const pages = useNotesPages();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const router = useRouter();
      const pageId = props.block.props.pageId;
      const child = pages.find((p) => p.id === pageId);

      if (!child) {
        return (
          <div className="flex items-center gap-2 py-1 px-1 rounded-md text-[15px]" style={{ color: "var(--text-faint)" }} contentEditable={false}>
            <FileText size={16} /> <span>Untitled (deleted)</span>
          </div>
        );
      }
      return (
        <div
          contentEditable={false}
          onClick={() => router.push(`/notes/${child.id}`)}
          className="flex items-center gap-2 py-1 px-1 rounded-md cursor-pointer hover:bg-[var(--surface-raised)] text-[15px]"
          style={{ color: "var(--text-primary)" }}
        >
          <span>{child.icon}</span>
          <span className="underline decoration-[var(--border-default)] underline-offset-2">{child.title || "Untitled"}</span>
        </div>
      );
    },
  }
);
