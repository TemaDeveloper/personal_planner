"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** A Notion-style web bookmark: paste a link, it unfurls into a preview card. */
export const BookmarkBlock = createReactBlockSpec(
  {
    type: "bookmark",
    propSchema: {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
      image: { default: "" },
      favicon: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { url, title, description, image, favicon } = props.block.props;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [input, setInput] = useState("");
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [busy, setBusy] = useState(false);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [err, setErr] = useState("");

      const embed = async () => {
        const u = input.trim();
        if (!u) return;
        setBusy(true);
        setErr("");
        try {
          const res = await fetch(`/api/notes/unfurl?url=${encodeURIComponent(u)}`);
          const data = await res.json();
          if (!res.ok) {
            setErr(data.error ?? "Failed to load link");
            return;
          }
          props.editor.updateBlock(props.block, {
            props: { url: data.url, title: data.title, description: data.description, image: data.image, favicon: data.favicon },
          });
        } catch {
          setErr("Failed to load link");
        } finally {
          setBusy(false);
        }
      };

      if (!url) {
        return (
          <div contentEditable={false} className="my-1 rounded-lg border p-3 flex flex-wrap gap-2 items-center" style={{ borderColor: "var(--border-subtle)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); embed(); } }}
              placeholder="Paste a link to create a bookmark…"
              className="flex-1 min-w-[160px] bg-transparent outline-none text-[13px]"
              style={{ color: "var(--text-primary)" }}
            />
            <button type="button" onClick={embed} disabled={busy} className="text-[12px] px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: "var(--surface-raised)", color: "var(--text-primary)" }}>
              {busy ? "Loading…" : "Embed"}
            </button>
            {err && <span className="text-[11px] w-full" style={{ color: "var(--alert)" }}>{err}</span>}
          </div>
        );
      }

      return (
        <a contentEditable={false} href={url} target="_blank" rel="noopener noreferrer" className="my-1 flex items-stretch rounded-lg border overflow-hidden hover:bg-[var(--surface-raised)]" style={{ borderColor: "var(--border-subtle)", textDecoration: "none" }}>
          <div className="flex-1 min-w-0 p-3">
            <div className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{title || url}</div>
            {description && <div className="text-[12px] mt-0.5 overflow-hidden" style={{ color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{description}</div>}
            <div className="text-[11px] mt-1.5 flex items-center gap-1.5 truncate" style={{ color: "var(--text-faint)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {favicon && <img src={favicon} alt="" width={13} height={13} className="inline-block" onError={(e) => { (e.currentTarget.style.display = "none"); }} />}
              {hostOf(url)}
            </div>
          </div>
          {image && <div className="w-28 md:w-40 shrink-0 bg-cover bg-center" style={{ backgroundImage: `url("${image}")` }} />}
        </a>
      );
    },
  }
);
