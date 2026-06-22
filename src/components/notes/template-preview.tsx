"use client";

import type { PresetBlock } from "@/lib/notes/templates";
import { buildTemplate, templateDatabases } from "@/lib/notes/templates";

/** A lightweight, read-only render of a template's block structure — shown in
 * the gallery so the user sees what they'll get before creating the page.
 * Covers the block types templates use (headings, text, callout, lists, quote,
 * divider, columns, button, and a labeled placeholder for database blocks). */
export function TemplatePreview({ templateKey }: { templateKey: string }) {
  const blocks = buildTemplate(templateKey);
  const dbs = templateDatabases(templateKey);
  return (
    <div className="text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
      {blocks.map((b, i) => <PreviewBlock key={i} block={b} dbs={dbs} />)}
    </div>
  );
}

function PreviewBlock({ block, dbs }: { block: PresetBlock; dbs: Record<string, { title: string; icon: string; views: { name: string }[] }> }) {
  const text = block.content ?? "";
  const kids = block.children ?? [];
  switch (block.type) {
    case "heading": {
      const lvl = Number(block.props?.level) || 1;
      const cls = lvl === 1 ? "text-[20px] font-bold mt-3 mb-1" : lvl === 2 ? "text-[16px] font-semibold mt-3 mb-1" : "text-[14px] font-semibold mt-2 mb-0.5";
      return <div className={cls}>{text}</div>;
    }
    case "paragraph":
      return <div className="min-h-[1.1em] mb-1" style={{ color: text ? "var(--text-primary)" : "var(--text-faint)" }}>{text || " "}</div>;
    case "quote":
      return <div className="border-l-2 pl-2 my-1 italic" style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>{text}</div>;
    case "divider":
      return <hr className="my-2" style={{ border: "none", borderTop: "1px solid var(--border-subtle)" }} />;
    case "bulletListItem":
      return <div className="flex gap-1.5 ml-1"><span style={{ color: "var(--text-faint)" }}>•</span><span>{text || " "}</span></div>;
    case "numberedListItem":
      return <div className="flex gap-1.5 ml-1"><span style={{ color: "var(--text-faint)" }}>1.</span><span>{text || " "}</span></div>;
    case "checkListItem":
      return <div className="flex items-center gap-1.5 ml-1"><span className="inline-block w-3.5 h-3.5 rounded-sm border" style={{ borderColor: "var(--border-default)" }} /><span>{text || " "}</span></div>;
    case "callout":
      return (
        <div className="flex gap-2 rounded-md px-2.5 py-2 my-1" data-callout-color={(block.props?.color as string) || "default"} style={{ background: "var(--surface-raised)" }}>
          <span className="shrink-0">{(block.props?.emoji as string) || "💡"}</span>
          <div className="min-w-0 flex-1">
            {text && <div>{text}</div>}
            {kids.map((c, i) => <PreviewBlock key={i} block={c} dbs={dbs} />)}
          </div>
        </div>
      );
    case "button":
      return <span className="inline-block rounded-md px-3 py-1 my-1 text-[12px] font-medium" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)" }}>{text || "Button"}</span>;
    case "columnList":
      return (
        <div className="flex gap-3 my-1">
          {kids.map((col, i) => (
            <div key={i} className="flex-1 min-w-0">
              {(col.children ?? []).map((c, j) => <PreviewBlock key={j} block={c} dbs={dbs} />)}
            </div>
          ))}
        </div>
      );
    case "database": {
      const sid = block.props?.databaseId as string;
      const db = sid ? dbs[sid] : undefined;
      const views = db?.views?.map((v) => v.name).join(" · ") || "Table";
      return (
        <div className="rounded-md border px-3 py-2.5 my-1.5" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-raised)" }}>
          <div className="flex items-center gap-1.5 font-medium">{db?.icon || "🗂️"} {db?.title || "Database"}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>Views: {views}</div>
        </div>
      );
    }
    case "tableOfContents":
      return <div className="text-[12px] my-1" style={{ color: "var(--text-faint)" }}>📑 Table of contents</div>;
    default:
      return text ? <div className="mb-1">{text}</div> : null;
  }
}
