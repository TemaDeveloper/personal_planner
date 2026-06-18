"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, Star, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import type { TreeNode } from "@/lib/notes/types";
import { orderBetween } from "@/lib/notes/order";
import { TemplateGallery } from "./template-gallery";
import { TrashModal } from "./trash-modal";

function subtreeIds(node: TreeNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(node.id);
  for (const c of node.children) subtreeIds(c, acc);
  return acc;
}
function flattenTree(nodes: TreeNode[], acc: TreeNode[] = []): TreeNode[] {
  for (const n of nodes) {
    acc.push(n);
    flattenTree(n.children, acc);
  }
  return acc;
}
async function setPinned(id: string, pinned: boolean) {
  await fetch(`/api/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned }),
  });
}
function findNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.children, id);
    if (f) return f;
  }
  return undefined;
}

export function PageTree({ tree, onChanged }: { tree: TreeNode[]; onChanged: () => void }) {
  const [dropRoot, setDropRoot] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const move = async (draggedId: string, targetId: string | null) => {
    if (draggedId === targetId) return;
    const dragged = findNode(tree, draggedId);
    if (!dragged) return;
    if (targetId && subtreeIds(dragged).has(targetId)) return;

    const siblings = targetId ? (findNode(tree, targetId)?.children ?? []) : tree;
    const maxOrder = siblings.length ? siblings[siblings.length - 1].order : undefined;
    const order = orderBetween(maxOrder, undefined);

    await fetch(`/api/notes/${draggedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: targetId, order }),
    });
    onChanged();
  };

  const favorites = flattenTree(tree).filter((n) => n.pinned);

  return (
    <div className="text-[13px]">
      {favorites.length > 0 && (
        <div className="mb-3">
          <span className="stat-label px-2" style={{ color: "var(--text-faint)" }}>Favorites</span>
          <div className="space-y-0.5 mt-1">
            {favorites.map((f) => (
              <Link key={f.id} href={`/notes/${f.id}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}>
                <span>{f.icon}</span>
                <span className="truncate">{f.title || "Untitled"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div
        className="flex items-center justify-between px-2 mb-2 rounded-md"
        style={{ outline: dropRoot ? "2px dashed var(--accent-color)" : "none" }}
        onDragOver={(e) => { e.preventDefault(); setDropRoot(true); }}
        onDragLeave={() => setDropRoot(false)}
        onDrop={(e) => { e.preventDefault(); setDropRoot(false); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, null); }}
      >
        <span className="stat-label" style={{ color: "var(--text-faint)" }}>Pages</span>
      </div>
      <div className="space-y-0.5">
        {tree.map((node) => <TreeRow key={node.id} node={node} depth={0} onChanged={onChanged} onMove={move} />)}
      </div>
      <div className="mt-2">
        <button type="button" onClick={() => setGalleryOpen(true)}
          className="w-full text-left px-2 py-1.5 rounded-md text-[12px]" style={{ color: "var(--text-muted)" }}>
          ＋ New page
        </button>
        <button type="button" onClick={() => setTrashOpen(true)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}>
          <Trash2 size={13} /> Trash
        </button>
      </div>
      {galleryOpen && (
        <TemplateGallery onClose={() => setGalleryOpen(false)} onCreated={onChanged} />
      )}
      {trashOpen && (
        <TrashModal onClose={() => setTrashOpen(false)} onChanged={onChanged} />
      )}
    </div>
  );
}

function TreeRow({ node, depth, onChanged, onMove }: {
  node: TreeNode; depth: number; onChanged: () => void; onMove: (draggedId: string, targetId: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [dropOver, setDropOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === `/notes/${node.id}`;
  const hasKids = node.children.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const del = async () => {
    setMenuOpen(false);
    await fetch(`/api/notes/${node.id}`, { method: "DELETE" });
    onChanged();
    if (active) router.push("/notes");
  };

  const addSubpage = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: node.id, template: "blank" }),
      });
      if (!res.ok) return;
      const { page } = await res.json();
      setOpen(true);
      onChanged();
      router.push(`/notes/${page.id}`);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    setMenuOpen(false);
    const res = await fetch(`/api/notes/${node.id}/duplicate`, { method: "POST" });
    if (!res.ok) return;
    const { page } = await res.json();
    onChanged();
    router.push(`/notes/${page.id}`);
  };

  const rename = async (value: string) => {
    setRenaming(false);
    const next = value.trim();
    if (!next || next === node.title) return;
    await fetch(`/api/notes/${node.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    onChanged();
  };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", node.id)}
        onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => { e.preventDefault(); setDropOver(false); const id = e.dataTransfer.getData("text/plain"); if (id) onMove(id, node.id); }}
        className="group flex items-center gap-1 rounded-md pr-1 hover:bg-[var(--surface-raised)]"
        style={{ paddingLeft: depth * 14, background: dropOver ? "var(--accent-glow)" : active ? "var(--surface-raised)" : undefined, outline: dropOver ? "1px dashed var(--accent-color)" : "none" }}
      >
        <button type="button" aria-label={open ? "Collapse" : "Expand"} onClick={() => setOpen((o) => !o)}
          className="w-4 h-6 flex items-center justify-center" style={{ color: "var(--text-faint)", visibility: hasKids ? "visible" : "hidden" }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {renaming ? (
          <span className="flex-1 flex items-center gap-1.5 py-1 min-w-0">
            <span>{node.icon}</span>
            <input autoFocus defaultValue={node.title}
              onBlur={(e) => rename(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") rename((e.target as HTMLInputElement).value); if (e.key === "Escape") setRenaming(false); }}
              className="flex-1 min-w-0 bg-transparent outline-none rounded px-1"
              style={{ color: "var(--text-primary)", boxShadow: "0 0 0 1px var(--border-default)" }} />
          </span>
        ) : (
          <Link href={`/notes/${node.id}`} className="flex-1 flex items-center gap-1.5 py-1 min-w-0"
            style={{ color: active ? "var(--text-primary)" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}>
            <span>{node.icon}</span>
            <span className="truncate">{node.title || "Untitled"}</span>
          </Link>
        )}
        <button type="button" aria-label={node.pinned ? "Unpin page" : "Pin to favorites"}
          onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await setPinned(node.id, !node.pinned); onChanged(); }}
          className={`px-1 ${node.pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          style={{ color: node.pinned ? "var(--accent-color)" : "var(--text-faint)" }}>
          <Star size={13} fill={node.pinned ? "currentColor" : "none"} />
        </button>
        <div className="relative shrink-0" ref={menuRef}>
          <button type="button" aria-label="Page options"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }}
            className={`px-1 flex items-center ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            style={{ color: "var(--text-faint)" }}>
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-1 py-1 rounded-lg border w-[160px] text-[13px]"
              style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
              <button type="button" onClick={() => { setMenuOpen(false); setRenaming(true); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-primary)" }}>
                Rename
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); addSubpage(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-primary)" }}>
                Add sub-page
              </button>
              <button type="button" onClick={duplicate}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-primary)" }}>
                Duplicate
              </button>
              <button type="button" onClick={del}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-raised)]" style={{ color: "var(--danger, #c0392b)" }}>
                Delete
              </button>
            </div>
          )}
        </div>
        <button type="button" aria-label="Add sub-page" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addSubpage(); }}
          disabled={busy}
          className="opacity-0 group-hover:opacity-100 px-1 flex items-center" style={{ color: "var(--text-faint)" }}>
          <Plus size={14} />
        </button>
      </div>
      {open && hasKids && (
        <div className="space-y-0.5">
          {node.children.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} onChanged={onChanged} onMove={onMove} />)}
        </div>
      )}
    </div>
  );
}
