"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";

interface FieldDefinition {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  required?: boolean;
}

interface CustomEntryFormProps {
  slug: string;
  fields: FieldDefinition[];
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
}

export function CustomEntryForm({ slug, fields, onClose, onSuccess, initialDate }: CustomEntryFormProps) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "boolean") init[f.key] = false;
      else if (f.type === "number") init[f.key] = 0;
      else init[f.key] = "";
    }
    return init;
  });
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/sections/${slug}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, data }),
    });

    if (res.ok) {
      toast.success("Entry saved");
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    }
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title="New Entry" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>

        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {field.label}{field.required && " *"}
            </label>

            {field.type === "boolean" && (
              <button
                type="button"
                onClick={() => updateField(field.key, !data[field.key])}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-left transition-all"
                style={{
                  background: data[field.key] ? "var(--accent-glow)" : "var(--surface-2)",
                  border: `1px solid ${data[field.key] ? "var(--accent-color)" : "var(--border-subtle)"}`,
                  color: data[field.key] ? "var(--accent-color)" : "var(--text-muted)",
                }}
              >
                <div
                  className="w-8 h-5 rounded-full transition-all flex items-center px-0.5"
                  style={{
                    background: data[field.key] ? "var(--accent-color)" : "var(--surface-1)",
                    border: data[field.key] ? "none" : "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full transition-all"
                    style={{
                      background: data[field.key] ? "white" : "var(--text-muted)",
                      transform: data[field.key] ? "translateX(12px)" : "translateX(0)",
                      opacity: data[field.key] ? 1 : 0.5,
                    }}
                  />
                </div>
                {data[field.key] ? "Yes" : "No"}
              </button>
            )}

            {field.type === "number" && (
              <input
                type="number"
                step="any"
                value={data[field.key] as number}
                onChange={(e) => updateField(field.key, Number(e.target.value))}
                required={field.required}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            )}

            {field.type === "text" && (
              <input
                type="text"
                value={data[field.key] as string}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            )}

            {field.type === "select" && field.options && (
              <select
                value={data[field.key] as string}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <option value="">Select...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {field.type === "date" && (
              <input
                type="date"
                value={data[field.key] as string}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            )}
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
