"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/notes/templates";

type Filter = "All" | TemplateCategory;

export function TemplateGallery({
  parentId = null,
  onClose,
  onCreated,
}: {
  parentId?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [busy, setBusy] = useState(false);

  const create = async (template: string) => {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, template }),
    });
    if (!res.ok) { setBusy(false); return; }
    const { page } = await res.json();
    onClose();
    onCreated();
    router.push(`/notes/${page.id}`);
  };

  const shownCategories = filter === "All" ? TEMPLATE_CATEGORIES : [filter];
  const tabs: Filter[] = ["All", ...TEMPLATE_CATEGORIES];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <button aria-label="Close" className="fixed inset-0 bg-[var(--backdrop-overlay)]" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl border flex flex-col max-h-[85vh]"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 20px 60px rgba(0,0,0,.22)" }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>New page</h2>
              <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>Start blank or pick a template</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}>✕</button>
          </div>
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tabs.map((t) => (
              <button key={t} type="button" onClick={() => setFilter(t)}
                className="px-2.5 py-1 rounded-full text-[12px] border transition-colors"
                style={
                  filter === t
                    ? { background: "var(--accent-glow)", color: "var(--accent-color)", borderColor: "var(--accent-color)" }
                    : { color: "var(--text-muted)", borderColor: "var(--border-subtle)" }
                }>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable template grid */}
        <div className="px-5 pb-5 overflow-y-auto">
          {shownCategories.map((cat) => {
            const items = TEMPLATES.filter((t) => t.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-5">
                <p className="stat-label mb-2" style={{ color: "var(--text-faint)" }}>{cat}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {items.map((t) => (
                    <button key={t.key} type="button" disabled={busy} onClick={() => create(t.key)}
                      className="group flex items-start gap-3 text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,.08)] disabled:opacity-60"
                      style={{ borderColor: "var(--border-subtle)", background: "var(--surface-raised)" }}>
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg text-[18px] shrink-0"
                        style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
                        {t.icon}
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className="block text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.label}</span>
                        <span className="block text-[11.5px] leading-snug" style={{ color: "var(--text-faint)" }}>{t.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
