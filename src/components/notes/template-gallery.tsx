"use client";

import { useRouter } from "next/navigation";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/notes/templates";

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

  const create = async (template: string) => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, template }),
    });
    if (!res.ok) return;
    const { page } = await res.json();
    onClose();
    onCreated();
    router.push(`/notes/${page.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <button aria-label="Close" className="fixed inset-0 bg-[var(--backdrop-overlay)]" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border p-5"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-default)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>New page</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-lg" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <div key={cat} className="mb-5">
            <p className="stat-label mb-2" style={{ color: "var(--text-faint)" }}>{cat}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                <button key={t.key} type="button" onClick={() => create(t.key)}
                  className="flex items-start gap-3 text-left rounded-lg border p-3 hover:bg-[var(--surface-raised)]"
                  style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-xl leading-none">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{t.label}</span>
                    <span className="block text-[11px]" style={{ color: "var(--text-faint)" }}>{t.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
