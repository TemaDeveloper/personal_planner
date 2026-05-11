"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Trash2,
  Check,
  ShoppingCart,
  Archive,
  X,
} from "lucide-react";

interface ShoppingItem {
  name: string;
  quantity: number;
  checked: boolean;
  price?: number;
}

interface ShoppingList {
  _id: string;
  name: string;
  items: ShoppingItem[];
  archived: boolean;
}

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    fetch("/api/shopping")
      .then((r) => r.json())
      .then((d) => {
        const allLists = d.lists || [];
        setLists(allLists);
        if (allLists.length > 0) setActiveListId(allLists[0]._id);
        setLoading(false);
      });
  }, []);

  const activeList = lists.find((l) => l._id === activeListId);

  const updateList = async (id: string, updates: Partial<ShoppingList>) => {
    const res = await fetch(`/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setLists((prev) => prev.map((l) => (l._id === id ? data.list : l)));
    }
  };

  const toggleItem = (listId: string, itemIdx: number) => {
    const list = lists.find((l) => l._id === listId);
    if (!list) return;
    const updated = [...list.items];
    updated[itemIdx] = { ...updated[itemIdx], checked: !updated[itemIdx].checked };
    updateList(listId, { items: updated });
  };

  const addItem = async () => {
    if (!activeList || !newItemName.trim()) return;
    const updated = [...activeList.items, { name: newItemName.trim(), quantity: 1, checked: false }];
    await updateList(activeList._id, { items: updated });
    setNewItemName("");
  };

  const removeItem = (listId: string, itemIdx: number) => {
    const list = lists.find((l) => l._id === listId);
    if (!list) return;
    const updated = list.items.filter((_, i) => i !== itemIdx);
    updateList(listId, { items: updated });
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Shopping" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="planner-surface p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Shopping"
        description="Shopping lists"
        action={
          <button
            onClick={() => setShowNewList(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
          >
            <Plus size={14} />
            New List
          </button>
        }
      />

      {lists.length === 0 ? (
        <div className="planner-surface p-8 text-center">
          <ShoppingCart size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No shopping lists yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* List selector */}
          <div className="lg:col-span-1 space-y-1">
            {lists.map((list) => {
              const pending = list.items.filter((i) => !i.checked).length;
              return (
                <button
                  key={list._id}
                  onClick={() => setActiveListId(list._id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all"
                  style={{
                    background: activeListId === list._id ? "var(--accent-glow)" : "var(--surface-1)",
                    border: `1px solid ${activeListId === list._id ? "var(--accent-color)" : "var(--border-subtle)"}`,
                  }}
                >
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: activeListId === list._id ? "var(--accent-color)" : "var(--text-primary)" }}
                  >
                    {list.name}
                  </span>
                  {pending > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--accent-color)", color: "var(--background)" }}
                    >
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active list items */}
          <div className="lg:col-span-3">
            {activeList ? (
              <div className="planner-surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">{activeList.name}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        updateList(activeList._id, { archived: true });
                        setLists((prev) => prev.filter((l) => l._id !== activeList._id));
                        setActiveListId(lists.find((l) => l._id !== activeList._id)?._id || null);
                        toast.success("List archived");
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground"
                      title="Archive list"
                    >
                      <Archive size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        await fetch(`/api/shopping/${activeList._id}`, { method: "DELETE" });
                        setLists((prev) => prev.filter((l) => l._id !== activeList._id));
                        setActiveListId(lists.find((l) => l._id !== activeList._id)?._id || null);
                        toast.success("List deleted");
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Unchecked items */}
                <div className="space-y-1 mb-3">
                  {activeList.items
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item }) => !item.checked)
                    .map(({ item, idx }) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                        <button
                          onClick={() => toggleItem(activeList._id, idx)}
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ border: "2px solid var(--border-subtle)" }}
                        />
                        <span className="text-sm flex-1">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                        )}
                        <button
                          onClick={() => removeItem(activeList._id, idx)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                </div>

                {/* Add item inline */}
                <form
                  onSubmit={(e) => { e.preventDefault(); addItem(); }}
                  className="flex gap-2 mb-4"
                >
                  <input
                    type="text"
                    placeholder="Add item..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                  <button
                    type="submit"
                    disabled={!newItemName.trim()}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                </form>

                {/* Checked items (faded) */}
                {activeList.items.some((i) => i.checked) && (
                  <div className="space-y-1 opacity-50">
                    <p className="text-[10px] text-muted-foreground mb-1">Completed</p>
                    {activeList.items
                      .map((item, idx) => ({ item, idx }))
                      .filter(({ item }) => item.checked)
                      .map(({ item, idx }) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                          <button
                            onClick={() => toggleItem(activeList._id, idx)}
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--accent-color)", border: "2px solid var(--accent-color)" }}
                          >
                            <Check size={12} style={{ color: "var(--background)" }} />
                          </button>
                          <span className="text-sm flex-1 line-through">{item.name}</span>
                          <button
                            onClick={() => removeItem(activeList._id, idx)}
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="planner-surface p-8 text-center">
                <p className="text-sm text-muted-foreground">Select a list</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showNewList && (
        <NewListModal
          onClose={() => setShowNewList(false)}
          onSuccess={(list) => {
            setLists((prev) => [list, ...prev]);
            setActiveListId(list._id);
            setShowNewList(false);
          }}
        />
      )}
    </div>
  );
}

function NewListModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (list: ShoppingList) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("List created");
      onSuccess(data.list);
    } else {
      toast.error("Failed to create list");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-xl p-6 animate-slide-up"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">New List</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="e.g. Groceries"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">{saving ? "Creating..." : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
