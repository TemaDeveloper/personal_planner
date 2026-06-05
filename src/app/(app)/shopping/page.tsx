"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormInput } from "@/components/ui/form-input";
import { StatBlock } from "@/components/ui/stat-block";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition } from "@/components/ui/page-transition";
import {
  Plus,
  Trash2,
  Check,
  ShoppingCart,
  Archive,
  X,
  Download,
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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const totalPending = lists.reduce(
    (sum, l) => sum + l.items.filter((i) => !i.checked).length,
    0
  );

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Shopping" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Shopping"
        description="Shopping lists"
        action={
          <>
            <button
              onClick={() => { window.location.href = "/api/export/shopping"; }}
              className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
              aria-label="Export to Excel"
            >
              <Download size={16} />
            </button>
            <Button onClick={() => setShowNewList(true)} size="md">
              <Plus size={14} />
              New List
            </Button>
          </>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No shopping lists"
          description="Create a list to keep track of what you need."
          actionLabel="New List"
          onAction={() => setShowNewList(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Hero metric strip */}
          <Card padding="md">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <StatBlock
                label="Pending items"
                value={String(totalPending)}
                sub={totalPending === 1 ? "item to pick up" : "items to pick up"}
                size="hero"
              />
              <StatBlock
                label="Lists"
                value={String(lists.length)}
                sub="active lists"
                size="lg"
              />
              {activeList && (
                <StatBlock
                  label="In this list"
                  value={String(activeList.items.filter((i) => !i.checked).length)}
                  sub={`of ${activeList.items.length} items`}
                  size="lg"
                />
              )}
            </div>
          </Card>

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
                    className={[
                      "flex items-center justify-between min-h-[44px]",
                      isActive
                        ? "border-[var(--accent-color)] bg-[var(--accent-wash,var(--surface-1))]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className="text-sm font-medium truncate"
                      style={{
                        color: isActive
                          ? "var(--accent-text)"
                          : "var(--text-primary)",
                      }}
                    >
                      {list.name}
                    </span>
                    {pending > 0 && (
                      <span
                        className="num text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2"
                        style={{
                          background: "var(--warn-wash)",
                          color: "var(--warn)",
                        }}
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
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                      {activeList.name}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                        aria-label="Archive list"
                      >
                        <Archive size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(activeList._id)}
                        className="hover:text-destructive"
                        aria-label="Delete list"
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
                        <Card
                          key={idx}
                          variant="inset"
                          padding="sm"
                          className="flex items-center gap-3 min-h-[44px]"
                        >
                          <button
                            onClick={() => toggleItem(activeList._id, idx)}
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 border-[var(--border-subtle)] hover:border-[var(--accent-color)] transition-colors"
                            aria-label="Mark as complete"
                          />
                          <span className="text-sm flex-1 text-[var(--text-primary)]">
                            {item.name}
                          </span>
                          {item.quantity > 1 && (
                            <span className="num text-xs text-[var(--text-muted)]">
                              x{item.quantity}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(activeList._id, idx)}
                            className="hover:text-destructive h-7 w-7"
                            aria-label="Remove item"
                          >
                            <X size={12} />
                          </Button>
                        </Card>
                      ))}

                    {activeList.items.filter((i) => !i.checked).length === 0 && (
                      <p className="text-sm text-[var(--text-muted)] py-2">
                        All items checked off. Add more below.
                      </p>
                    )}
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
                      aria-label="Add item"
                    >
                      <Plus size={14} />
                    </Button>
                  </form>

                  {/* Checked items (faded) */}
                  {activeList.items.some((i) => i.checked) && (
                    <div className="space-y-1 opacity-50">
                      <p className="stat-label mb-1">Completed</p>
                      {activeList.items
                        .map((item, idx) => ({ item, idx }))
                        .filter(({ item }) => item.checked)
                        .map(({ item, idx }) => (
                          <Card
                            key={idx}
                            variant="inset"
                            padding="sm"
                            className="flex items-center gap-3 min-h-[44px]"
                          >
                            <button
                              onClick={() => toggleItem(activeList._id, idx)}
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-[var(--accent-color)] border-2 border-[var(--accent-color)]"
                              aria-label="Mark as incomplete"
                            >
                              <Check size={12} className="text-[var(--background)]" />
                            </button>
                            <span className="text-sm flex-1 line-through text-[var(--text-primary)]">
                              {item.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(activeList._id, idx)}
                              className="hover:text-destructive h-7 w-7"
                              aria-label="Remove item"
                            >
                              <X size={12} />
                            </Button>
                          </Card>
                        ))}
                    </div>
                  )}
                </Card>
              ) : (
                <Card padding="lg" className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <ShoppingCart size={32} className="text-[var(--text-faint)]" />
                  <p className="text-sm text-[var(--text-muted)]">Select a list to view its items</p>
                </Card>
              )}
            </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/shopping/${deleteTarget}`, { method: "DELETE" });
            if (res.ok) {
              setLists((prev) => prev.filter((l) => l._id !== deleteTarget));
              setActiveListId(lists.find((l) => l._id !== deleteTarget)?._id || null);
              toast.success("List deleted");
            } else {
              toast.error("Failed to delete shopping list");
            }
          } catch {
            toast.error("Network error while deleting shopping list");
          }
          setDeleting(false);
          setDeleteTarget(null);
        }}
        message="This will permanently delete this shopping list and all its items."
        loading={deleting}
      />
    </PageTransition>
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
