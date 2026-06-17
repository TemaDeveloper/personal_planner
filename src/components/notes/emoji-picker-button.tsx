"use client";

import { useEffect, useRef, useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

export function EmojiPickerButton({ value, onPick }: { value: string; onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" aria-label="Change icon" onClick={() => setOpen((o) => !o)}
        className="text-4xl leading-none hover:bg-[var(--surface-raised)] rounded-md px-1">
        {value || "📄"}
      </button>
      {open && (
        <div className="absolute z-50 mt-1">
          <Picker data={data} onEmojiSelect={(e: { native: string }) => { onPick(e.native); setOpen(false); }} theme="auto" previewPosition="none" skinTonePosition="none" />
        </div>
      )}
    </div>
  );
}
