"use client";

import { useEffect, useRef, useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { EmojiPickerButton } from "@/components/notes/emoji-picker-button";
import { CALLOUT_COLORS } from "@/lib/notes/callout-colors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CalloutView({ block, editor, contentRef }: { block: any; editor: any; contentRef: (el: HTMLElement | null) => void }) {
  const color = (block.props.color as string) || "default";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div data-callout-color={color} className="group/callout relative flex gap-2.5 rounded-md px-3 py-3 my-1">
      <span contentEditable={false} className="shrink-0 leading-7">
        <EmojiPickerButton
          value={block.props.emoji}
          onPick={(emoji) => editor.updateBlock(block, { props: { emoji } })}
          buttonClassName="text-[18px] leading-7 hover:bg-[var(--surface-1)] rounded px-0.5"
        />
      </span>
      <div ref={contentRef} className="flex-1 min-w-0 leading-7" />
      {/* Color picker (appears on hover) */}
      <div className="relative shrink-0 opacity-0 group-hover/callout:opacity-100" ref={ref} contentEditable={false}>
        <button type="button" aria-label="Callout color" onClick={() => setOpen((o) => !o)}
          className="w-5 h-5 rounded-full border" style={{ background: CALLOUT_COLORS.find((c) => c.key === color)?.swatch, borderColor: "var(--border-default)" }} />
        {open && (
          <div className="absolute right-0 z-50 mt-1 p-1.5 rounded-lg border flex flex-wrap gap-1 w-[136px]"
            style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
            {CALLOUT_COLORS.map((c) => (
              <button key={c.key} type="button" aria-label={c.label} title={c.label}
                onClick={() => { editor.updateBlock(block, { props: { color: c.key } }); setOpen(false); }}
                className="w-5 h-5 rounded-full border" style={{ background: c.swatch, borderColor: "var(--border-default)" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A Notion-style callout: clickable emoji + editable highlighted box + color swatch. */
export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: { emoji: { default: "💡" }, color: { default: "default" } },
    content: "inline",
  },
  {
    render: (props) => <CalloutView block={props.block} editor={props.editor} contentRef={props.contentRef} />,
  }
);
