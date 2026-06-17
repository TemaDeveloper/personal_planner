"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { TreeNode } from "@/lib/notes/types";
import { orderBetween } from "@/lib/notes/order";
import { TemplateGallery } from "./template-gallery";

function subtreeIds(node: TreeNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(node.id);
  for (const c of node.children) subtreeIds(c, acc);
  return acc;
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

  return (
    <div className="text-[13px]">
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
      </div>
      {galleryOpen && (
        <TemplateGallery onClose={() => setGalleryOpen(false)} onCreated={onChanged} />
      )}
    </div>
  );
}

function TreeRow({ node, depth, onChanged, onMove }: {
  node: TreeNode; depth: number; onChanged: () => void; onMove: (draggedId: string, targetId: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [dropOver, setDropOver] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === `/notes/${node.id}`;
  const hasKids = node.children.length > 0;

  const del = async () => {
    await fetch(`/api/notes/${node.id}`, { method: "DELETE" });
    onChanged();
    if (active) router.push("/notes");
  };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", node.id)}
        onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => { e.preventDefault(); setDropOver(false); const id = e.dataTransfer.getData("text/plain"); if (id) onMove(id, node.id); }}
        className="group flex items-center gap-1 rounded-md pr-1"
        style={{ paddingLeft: depth * 14, background: dropOver ? "var(--accent-glow)" : active ? "var(--accent-glow)" : undefined, outline: dropOver ? "1px dashed var(--accent-color)" : "none" }}
      >
        <button type="button" aria-label={open ? "Collapse" : "Expand"} onClick={() => setOpen((o) => !o)}
          className="w-4 h-6 flex items-center justify-center" style={{ color: "var(--text-faint)", visibility: hasKids ? "visible" : "hidden" }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <Link href={`/notes/${node.id}`} className="flex-1 flex items-center gap-1.5 py-1 min-w-0"
          style={{ color: active ? "var(--accent-color)" : "var(--text-muted)" }}>
          <span>{node.icon}</span>
          <span className="truncate">{node.title || "Untitled"}</span>
        </Link>
        <button type="button" aria-label="Delete page" onClick={del}
          className="opacity-0 group-hover:opacity-100 px-1 text-[12px]" style={{ color: "var(--text-faint)" }}>🗑</button>
      </div>
      {open && hasKids && (
        <div className="space-y-0.5">
          {node.children.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} onChanged={onChanged} onMove={onMove} />)}
        </div>
      )}
    </div>
  );
}
