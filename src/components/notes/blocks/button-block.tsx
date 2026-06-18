"use client";

import { useEffect, useRef, useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { Link2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ButtonView({ block, editor, contentRef }: { block: any; editor: any; contentRef: (el: HTMLElement | null) => void }) {
  const url = (block.props.url as string) || "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(url);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="group/btn flex items-center gap-2 my-1">
      <span
        className="inline-flex items-center rounded-md px-3 py-1.5 text-[14px] font-medium cursor-pointer"
        style={{ background: "var(--surface-raised)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
        onClick={() => { if (url) window.open(url, "_blank", "noopener"); }}
      >
        <span ref={contentRef} />
      </span>
      <span className="relative" ref={ref} contentEditable={false}>
        <button type="button" aria-label="Set button link"
          onClick={() => { setDraft(url); setOpen((o) => !o); }}
          className="opacity-0 group-hover/btn:opacity-100 p-1" style={{ color: "var(--text-faint)" }}>
          <Link2 size={14} />
        </button>
        {open && (
          <div className="absolute left-0 z-50 mt-1 p-2 rounded-lg border w-64 animate-[notesPop_120ms_ease-out]"
            style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
            <input autoFocus value={draft} placeholder="https://…  (opens on click)"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { editor.updateBlock(block, { props: { url: draft.trim() } }); setOpen(false); } }}
              className="w-full px-2 py-1 text-[13px] bg-transparent outline-none rounded border"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }} />
          </div>
        )}
      </span>
    </div>
  );
}

/** A Notion-style button: editable label + optional link that opens on click. */
export const ButtonBlock = createReactBlockSpec(
  {
    type: "button",
    propSchema: { url: { default: "" } },
    content: "inline",
  },
  {
    render: (props) => <ButtonView block={props.block} editor={props.editor} contentRef={props.contentRef} />,
  }
);
