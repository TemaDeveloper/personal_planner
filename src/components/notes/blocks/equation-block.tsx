"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import "katex/dist/katex.min.css";
import { katexHtml } from "@/lib/notes/katex-html";

/** A block-level math equation (KaTeX). Click to edit the LaTeX source. */
export const EquationBlock = createReactBlockSpec(
  {
    type: "equation",
    propSchema: { latex: { default: "" } },
    content: "none",
  },
  {
    render: (props) => {
      const latex = props.block.props.latex;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [editing, setEditing] = useState(!latex);

      if (editing) {
        return (
          <div contentEditable={false} className="my-1">
            <textarea
              autoFocus
              defaultValue={latex}
              placeholder="Enter a LaTeX equation, e.g. \\frac{a}{b}"
              onBlur={(e) => {
                props.editor.updateBlock(props.block, { props: { latex: e.target.value } });
                setEditing(false);
              }}
              className="w-full rounded-md p-2 text-[13px] font-mono outline-none resize-y"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
          </div>
        );
      }
      return (
        <div
          contentEditable={false}
          onClick={() => setEditing(true)}
          className="my-1 cursor-pointer rounded-md px-2 py-1 hover:bg-[var(--surface-raised)] overflow-x-auto text-center"
          dangerouslySetInnerHTML={{ __html: katexHtml(latex, true) }}
        />
      );
    },
  }
);
