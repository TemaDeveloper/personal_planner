"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import { Plus, Trash2, BookOpen, Star, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition } from "@/components/ui/page-transition";

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
            <Card key={i} className="h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Reading"
        description="Reading list & progress"
        action={
          <>
            <button
              onClick={() => { window.location.href = "/api/export/reading"; }}
              className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
              aria-label="Export to Excel"
            >
              <Download size={16} />
            </button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} />
              Add Book
            </Button>
          </>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-[var(--surface-1)]">
        {FILTER_TABS.map((t) => (
          <Button
            key={t.id}
            variant={filter === t.id ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter(t.id)}
            className="flex-1 border-0"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No books yet"
            description="Add a book you're reading or want to read."
            actionLabel="Add Book"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <Card className="text-center">
            <BookOpen size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No books match this filter.</p>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((book) => {
            const pct = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;
            return (
              <Card key={book._id} padding="md">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">{book.title}</span>
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
                          <Progress value={pct} size="sm" className="flex-1" />
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
                            color={book.rating && s <= book.rating ? "var(--accent-color)" : "var(--text-muted)"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <FormSelect
                      value={book.status}
                      onChange={(e) => updateBook(book._id, { status: e.target.value })}
                      className="text-xs !py-1 !px-1"
                    >
                      <option value="want-to-read">Want to Read</option>
                      <option value="reading">Reading</option>
                      <option value="completed">Completed</option>
                    </FormSelect>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete book"
                      onClick={async () => {
                        await fetch(`/api/reading/${book._id}`, { method: "DELETE" });
                        setBooks((prev) => prev.filter((b) => b._id !== book._id));
                        toast.success("Book removed");
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Book"
        maxWidth="max-w-md"
      >
        <BookModalForm
          onClose={() => setShowForm(false)}
          onSuccess={(b) => {
            setBooks((prev) => [b, ...prev]);
            setShowForm(false);
          }}
        />
      </Modal>
    </PageTransition>
  );
}

function BookModalForm({
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Title"
        type="text"
        placeholder="Book title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <FormInput
        label="Author"
        type="text"
        placeholder="Author name"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="Total pages"
          type="number"
          min={0}
          placeholder="300"
          value={totalPages}
          onChange={(e) => setTotalPages(e.target.value)}
        />
        <FormSelect
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="want-to-read">Want to Read</option>
          <option value="reading">Reading</option>
          <option value="completed">Completed</option>
        </FormSelect>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving || !title.trim()}>
          {saving ? "Adding..." : "Add book"}
        </Button>
      </div>
    </form>
  );
}
