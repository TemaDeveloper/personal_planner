"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/notes/templates";

export function NewPageMenu({ parentId = null, onCreated }: { parentId?: string | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const create = async (template: string) => {
    setOpen(false);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, template }),
    });
    if (!res.ok) return;
    const { page } = await res.json();
    onCreated();
    router.push(`/notes/${page.id}`);
  };

  const basicTemplates = TEMPLATES.filter((t) => t.category === "Basic");

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-2 py-1.5 rounded-md text-[12px]" style={{ color: "var(--text-muted)" }}>
        ＋ New page
      </button>
      {open && (
        <div className="absolute z-30 left-0 mt-1 w-52 rounded-lg border p-1"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          {basicTemplates.map((p) => (
            <button key={p.key} type="button" onClick={() => create(p.key)}
              className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[var(--surface-raised)]">
              <div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{p.label}</div>
              <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>{p.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
