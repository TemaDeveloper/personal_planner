"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { EmojiPickerButton } from "@/components/notes/emoji-picker-button";

/** A Notion-style callout: a clickable emoji icon + an editable highlighted box. */
export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: { emoji: { default: "💡" } },
    content: "inline",
  },
  {
    render: (props) => (
      <div
        className="flex gap-2.5 rounded-md px-3 py-3 my-1"
        style={{ background: "var(--surface-raised)" }}
      >
        <span contentEditable={false} className="shrink-0 leading-7">
          <EmojiPickerButton
            value={props.block.props.emoji}
            onPick={(emoji) => props.editor.updateBlock(props.block, { props: { emoji } })}
            buttonClassName="text-[18px] leading-7 hover:bg-[var(--surface-1)] rounded px-0.5"
          />
        </span>
        <div ref={props.contentRef} className="flex-1 min-w-0 leading-7" />
      </div>
    ),
  }
);
