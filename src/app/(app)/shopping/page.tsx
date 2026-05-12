"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormInput } from "@/components/ui/form-input";
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
            <Card key={i} className="h-32 animate-pulse" />
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
          <Button onClick={() => setShowNewList(true)} size="md">
            <Plus size={14} />
            New List
          </Button>
        }
      />

      {lists.length === 0 ? (
        <Card padding="lg" className="text-center">
          <ShoppingCart size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">No shopping lists yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* List selector */}
          <div className="lg:col-span-1 space-y-1">
            {lists.map((list) => {
              const pending = list.items.filter((i) => !i.checked).length;
              const isActive = activeListId === list._id;
              return (
                <Card
                  key={list._id}
                  variant={isActive ? "elevated" : "default"}
                  interactive
                  padding="sm"
                  onClick={() => setActiveListId(list._id)}
                  className="flex items-center justify-between"
                  style={isActive ? {
                    background: "var(--accent-glow)",
                    borderColor: "var(--accent-color)",
                  } : undefined}
                >
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: isActive ? "var(--accent-color)" : "var(--text-primary)" }}
                  >
                    {list.name}
                  </span>
                  {pending > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-color)] text-[var(--background)]"
                    >
                      {pending}
                    </span>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Active list items */}
          <div className="lg:col-span-3">
            {activeList ? (
              <Card padding="md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{activeList.name}</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        updateList(activeList._id, { archived: true });
                        setLists((prev) => prev.filter((l) => l._id !== activeList._id));
                        setActiveListId(lists.find((l) => l._id !== activeList._id)?._id || null);
                        toast.success("List archived");
                      }}
                      title="Archive list"
                    >
                      <Archive size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await fetch(`/api/shopping/${activeList._id}`, { method: "DELETE" });
                        setLists((prev) => prev.filter((l) => l._id !== activeList._id));
                        setActiveListId(lists.find((l) => l._id !== activeList._id)?._id || null);
                        toast.success("List deleted");
                      }}
                      className="hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Unchecked items */}
                <div className="space-y-1 mb-3">
                  {activeList.items
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item }) => !item.checked)
                    .map(({ item, idx }) => (
                      <Card key={idx} variant="inset" padding="sm" className="flex items-center gap-3">
                        <button
                          onClick={() => toggleItem(activeList._id, idx)}
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 border-[var(--border-subtle)]"
                        />
                        <span className="text-sm flex-1 text-[var(--text-primary)]">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-[var(--text-muted)]">x{item.quantity}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(activeList._id, idx)}
                          className="hover:text-destructive h-7 w-7"
                        >
                          <X size={12} />
                        </Button>
                      </Card>
                    ))}
                </div>

                {/* Add item inline */}
                <form
                  onSubmit={(e) => { e.preventDefault(); addItem(); }}
                  className="flex gap-2 mb-4"
                >
                  <FormInput
                    type="text"
                    placeholder="Add item..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!newItemName.trim()}
                    size="icon"
                  >
                    <Plus size={14} />
                  </Button>
                </form>

                {/* Checked items (faded) */}
                {activeList.items.some((i) => i.checked) && (
                  <div className="space-y-1 opacity-50">
                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Completed</p>
                    {activeList.items
                      .map((item, idx) => ({ item, idx }))
                      .filter(({ item }) => item.checked)
                      .map(({ item, idx }) => (
                        <Card key={idx} variant="inset" padding="sm" className="flex items-center gap-3">
                          <button
                            onClick={() => toggleItem(activeList._id, idx)}
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-[var(--accent-color)] border-2 border-[var(--accent-color)]"
                          >
                            <Check size={12} className="text-[var(--background)]" />
                          </button>
                          <span className="text-sm flex-1 line-through text-[var(--text-primary)]">{item.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(activeList._id, idx)}
                            className="hover:text-destructive h-7 w-7"
                          >
                            <X size={12} />
                          </Button>
                        </Card>
                      ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card padding="lg" className="text-center">
                <p className="text-sm text-[var(--text-muted)]">Select a list</p>
              </Card>
            )}
          </div>
        </div>
      )}

      <NewListModal
        open={showNewList}
        onClose={() => setShowNewList(false)}
        onSuccess={(list) => {
          setLists((prev) => [list, ...prev]);
          setActiveListId(list._id);
          setShowNewList(false);
        }}
      />
    </div>
  );
}

function NewListModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (list: ShoppingList) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

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
    <Modal open={open} onClose={onClose} title="New List">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          type="text"
          placeholder="e.g. Groceries"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1"
          >
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
