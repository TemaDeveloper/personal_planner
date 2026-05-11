"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Trash2, BookOpen, Star, X } from "lucide-react";

interface Book {
  _id: string;
  title: string;
  author?: string;
  totalPages: number;
  currentPage: number;
  status: string;
  rating?: number;
  notes?: string;
}

const FILTER_TABS = [
  { id: "", label: "All" },
  { id: "reading", label: "Reading" },
  { id: "completed", label: "Completed" },
  { id: "want-to-read", label: "Want to Read" },
];

export default function ReadingPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/reading")
      .then((r) => r.json())
      .then((d) => {
        setBooks(d.books || []);
        setLoading(false);
      });
  }, []);

  const filtered = filter ? books.filter((b) => b.status === filter) : books;

  const updateBook = async (id: string, updates: Partial<Book>) => {
    const res = await fetch(`/api/reading/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setBooks((prev) => prev.map((b) => (b._id === id ? data.book : b)));
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Reading" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="planner-surface p-6 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Reading"
        description="Reading list & progress"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
          >
            <Plus size={14} />
            Add Book
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--surface-1)" }}>
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className="flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all"
            style={{
              background: filter === t.id ? "var(--accent-glow)" : "transparent",
              color: filter === t.id ? "var(--accent-color)" : "var(--text-muted)",
              border: filter === t.id ? "1px solid var(--accent-color)" : "1px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="planner-surface p-8 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {books.length === 0 ? "No books yet. Add your first!" : "No books match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((book) => {
            const pct = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;
            return (
              <div key={book._id} className="planner-surface p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold">{book.title}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{
                          background: book.status === "reading" ? "var(--accent-glow)" : "var(--surface-2)",
                          color: book.status === "reading" ? "var(--accent-color)" : "var(--text-muted)",
                        }}
                      >
                        {book.status.replace("-", " ")}
                      </span>
                    </div>
                    {book.author && (
                      <p className="text-xs text-muted-foreground mb-2">by {book.author}</p>
                    )}

                    {/* Progress bar for reading books */}
                    {book.status === "reading" && book.totalPages > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: "var(--accent-color)" }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {book.currentPage}/{book.totalPages}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={book.totalPages}
                          value={book.currentPage}
                          onChange={(e) => updateBook(book._id, { currentPage: Number(e.target.value) })}
                          className="w-full h-1 accent-primary"
                        />
                      </div>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateBook(book._id, { rating: s })}
                          className="p-0.5"
                        >
                          <Star
                            size={14}
                            fill={book.rating && s <= book.rating ? "var(--accent-color)" : "none"}
                            style={{ color: book.rating && s <= book.rating ? "var(--accent-color)" : "var(--text-muted)" }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      value={book.status}
                      onChange={(e) => updateBook(book._id, { status: e.target.value })}
                      className="text-xs rounded px-1 py-1"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    >
                      <option value="want-to-read">Want to Read</option>
                      <option value="reading">Reading</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={async () => {
                        await fetch(`/api/reading/${book._id}`, { method: "DELETE" });
                        setBooks((prev) => prev.filter((b) => b._id !== book._id));
                        toast.success("Book removed");
                      }}
                      className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <BookModal
          onClose={() => setShowForm(false)}
          onSuccess={(b) => {
            setBooks((prev) => [b, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function BookModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (b: Book) => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [status, setStatus] = useState("want-to-read");
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
    if (!title.trim()) return;
    setSaving(true);

    const res = await fetch("/api/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        author,
        totalPages: totalPages ? Number(totalPages) : 0,
        status,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Book added");
      onSuccess(data.book);
    } else {
      toast.error("Failed to add book");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl p-6 animate-slide-up"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Book</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
            <input
              type="text"
              placeholder="Book title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Author</label>
            <input
              type="text"
              placeholder="Author name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Total pages</label>
              <input
                type="number"
                min="0"
                placeholder="300"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <option value="want-to-read">Want to Read</option>
                <option value="reading">Reading</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving || !title.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">{saving ? "Adding..." : "Add book"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
