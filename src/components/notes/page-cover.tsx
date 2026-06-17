"use client";

import { useRef, useState } from "react";

export function PageCover({ coverUrl, onChange }: { coverUrl: string | null; onChange: (url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/notes/upload", { method: "POST", body });
      if (res.ok) onChange((await res.json()).url as string);
      else alert((await res.json().catch(() => ({}))).error ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const pick = () => fileRef.current?.click();

  return (
    <div className="group relative">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      {coverUrl ? (
        <div className="relative w-full h-44 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="Page cover" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 hidden group-hover:flex gap-1.5">
            <button type="button" onClick={pick} disabled={busy}
              className="text-[12px] px-2 py-1 rounded-md" style={{ background: "var(--surface-1)", color: "var(--text-primary)" }}>
              {busy ? "Uploading…" : "Change"}
            </button>
            <button type="button" onClick={() => onChange(null)}
              className="text-[12px] px-2 py-1 rounded-md" style={{ background: "var(--surface-1)", color: "var(--text-muted)" }}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={pick} disabled={busy}
          className="text-[12px] px-2 py-1 rounded-md" style={{ color: "var(--text-faint)" }}>
          {busy ? "Uploading…" : "＋ Add cover"}
        </button>
      )}
    </div>
  );
}
