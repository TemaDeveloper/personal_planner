"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES, TEMPLATE_CATEGORIES, templateCover, type TemplateCategory } from "@/lib/notes/templates";
import { TemplatePreview } from "@/components/notes/template-preview";

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
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const previewT = previewKey ? TEMPLATES.find((t) => t.key === previewKey) : null;

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
            {previewT ? (
              <button type="button" onClick={() => setPreviewKey(null)}
                className="flex items-center gap-1.5 text-[13px] rounded-md px-2 py-1 -ml-2 hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}>
                ← All templates
              </button>
            ) : (
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>New page</h2>
                <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>Start blank or pick a template</p>
              </div>
            )}
            <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}>✕</button>
          </div>
          {/* Category tabs (hidden while previewing) */}
          {!previewT && (
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
          )}
        </div>

        {previewT ? (
          /* ── Preview pane ── */
          <>
            <div className="px-5 pb-5 overflow-y-auto">
              {/* Cover + title */}
              <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center justify-center h-24" style={{ background: templateCover(previewT.key) }}>
                  <span className="text-[40px] drop-shadow-sm">{previewT.icon}</span>
                </div>
              </div>
              <h2 className="text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>{previewT.label}</h2>
              <p className="text-[12.5px] mb-3" style={{ color: "var(--text-faint)" }}>{previewT.description}</p>
              {/* Read-only preview of the template content */}
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-raised)" }}>
                <TemplatePreview templateKey={previewT.key} />
              </div>
            </div>
            {/* Footer action */}
            <div className="px-5 py-3 border-t flex items-center justify-end gap-2 shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
              <button type="button" onClick={() => setPreviewKey(null)} disabled={busy}
                className="px-3 py-1.5 rounded-lg text-[13px]" style={{ color: "var(--text-muted)" }}>Back</button>
              <button type="button" onClick={() => create(previewT.key)} disabled={busy}
                className="px-4 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-60"
                style={{ background: "var(--accent-color)", color: "var(--accent-contrast, #fff)" }}>
                Use this template
              </button>
            </div>
          </>
        ) : (
          /* ── Template grid ── */
          <div className="px-5 pb-5 overflow-y-auto">
            {shownCategories.map((cat) => {
              const items = TEMPLATES.filter((t) => t.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-5">
                  <p className="stat-label mb-2" style={{ color: "var(--text-faint)" }}>{cat}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map((t) => (
                      <button key={t.key} type="button" disabled={busy}
                        onClick={() => (t.key === "blank" ? create(t.key) : setPreviewKey(t.key))}
                        className="group text-left rounded-xl border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,.1)] disabled:opacity-60"
                        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-raised)" }}>
                        {/* Cover — representative gradient + the template's icon (Notion-style) */}
                        <span className="flex items-center justify-center h-20 w-full" style={{ background: templateCover(t.key) }}>
                          <span className="text-[30px] drop-shadow-sm">{t.icon}</span>
                        </span>
                        <span className="block p-2.5">
                          <span className="block text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.label}</span>
                          <span className="block text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--text-faint)" }}>{t.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
