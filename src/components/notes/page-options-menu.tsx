"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Trash2, MoveHorizontal } from "lucide-react";

/** The page "···" menu: full-width toggle + delete. */
export function PageOptionsMenu({
  fullWidth,
  onToggleFullWidth,
  onDelete,
}: {
  fullWidth: boolean;
  onToggleFullWidth: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label="Page options" onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-lg border p-1 z-50"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          <button type="button" onClick={() => { onToggleFullWidth(); setOpen(false); }}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-[13px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-primary)" }}>
            <span className="flex items-center gap-2"><MoveHorizontal size={15} /> Full width</span>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{fullWidth ? "On" : "Off"}</span>
          </button>
          <button type="button" onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--alert)" }}>
            <Trash2 size={15} /> Delete page
          </button>
        </div>
      )}
    </div>
  );
}
