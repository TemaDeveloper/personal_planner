"use client";

import { useState } from "react";
import { createReactBlockSpec, useEditorChange } from "@blocknote/react";
import { collectHeadings, type TocItem } from "@/lib/notes/toc";

/** A live table of contents listing the page's headings; click to scroll. */
export const TableOfContentsBlock = createReactBlockSpec(
  {
    type: "tableOfContents",
    propSchema: {},
    content: "none",
  },
  {
    render: (props) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [items, setItems] = useState<TocItem[]>(() => collectHeadings(props.editor.document));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEditorChange(() => setItems(collectHeadings(props.editor.document)), props.editor);

      if (items.length === 0) {
        return (
          <div contentEditable={false} className="py-1 text-[13px]" style={{ color: "var(--text-faint)" }}>
            Table of contents — add headings to populate it
          </div>
        );
      }
      const minLevel = Math.min(...items.map((i) => i.level));
      return (
        <div contentEditable={false} className="py-1">
          {items.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() =>
                document.querySelector(`[data-id="${h.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="block w-full text-left text-[13px] py-0.5 hover:underline truncate"
              style={{ paddingLeft: (h.level - minLevel) * 16, color: "var(--text-muted)" }}
            >
              {h.text}
            </button>
          ))}
        </div>
      );
    },
  }
);
