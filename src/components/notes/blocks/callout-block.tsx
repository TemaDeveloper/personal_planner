"use client";

import { createReactBlockSpec } from "@blocknote/react";

/** A Notion-style callout: an emoji + an editable highlighted box. */
export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: { emoji: { default: "💡" } },
    content: "inline",
  },
  {
    render: (props) => (
      <div
        className="flex gap-2.5 rounded-lg px-3 py-2.5 my-1"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
      >
        <span contentEditable={false} className="text-[18px] leading-7 select-none">
          {props.block.props.emoji}
        </span>
        <div ref={props.contentRef} className="flex-1 min-w-0 leading-7" />
      </div>
    ),
  }
);
