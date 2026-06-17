"use client";

import dynamic from "next/dynamic";

/** BlockNote is client/ESM-only — load it without SSR. */
export const NotesEditorLoader = dynamic(
  () => import("./notes-editor").then((m) => m.NotesEditor),
  { ssr: false, loading: () => <div className="p-6 text-sm" style={{ color: "var(--text-faint)" }}>Loading editor…</div> }
);
