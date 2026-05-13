"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-input";

interface FieldDefinition {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  required?: boolean;
  formula?: string;
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
    setData((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-compute formula fields
      for (const f of fields) {
        if (f.formula) {
          try {
            // Simple arithmetic: "salePrice - purchasePrice"
            const result = f.formula.replace(/[a-zA-Z_]\w*/g, (varName) =>
              String(Number(next[varName]) || 0)
            );
            next[f.key] = Function(`"use strict"; return (${result})`)();
          } catch {
            // Skip if formula can't be evaluated
          }
        }
      }
      return next;
    });
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
        <FormInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        {fields.map((field) => (
          <div key={field.key}>
            {field.type === "boolean" && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  {field.label}{field.required && " *"}
                </label>
                <button
                  type="button"
                  onClick={() => updateField(field.key, !data[field.key])}
                  className={
                    "flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-left transition-all border " +
                    (data[field.key]
                      ? "bg-[var(--accent-glow)] border-[var(--accent-color)] text-[var(--accent-color)]"
                      : "bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-muted)]")
                  }
                >
                  <div
                    className={
                      "w-8 h-5 rounded-full transition-all flex items-center px-0.5 " +
                      (data[field.key]
                        ? "bg-[var(--accent-color)]"
                        : "bg-[var(--surface-1)] border border-[var(--border-subtle)]")
                    }
                  >
                    <div
                      className={
                        "w-4 h-4 rounded-full transition-all " +
                        (data[field.key]
                          ? "bg-white translate-x-3"
                          : "bg-[var(--text-muted)] translate-x-0 opacity-50")
                      }
                    />
                  </div>
                  {data[field.key] ? "Yes" : "No"}
                </button>
              </div>
            )}

            {field.type === "number" && (
              <FormInput
                label={`${field.label}${field.required ? " *" : ""}${field.formula ? " (auto)" : ""}`}
                type="number"
                step="any"
                value={data[field.key] as number}
                onChange={(e) => updateField(field.key, Number(e.target.value))}
                required={field.required}
                readOnly={!!field.formula}
                className={field.formula ? "opacity-70" : ""}
              />
            )}

            {field.type === "text" && (
              <FormInput
                label={`${field.label}${field.required ? " *" : ""}`}
                type="text"
                value={data[field.key] as string}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
              />
            )}

            {field.type === "select" && field.options && (
              <FormSelect
                label={`${field.label}${field.required ? " *" : ""}`}
                value={data[field.key] as string}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
              >
                <option value="">Select...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </FormSelect>
            )}

            {field.type === "date" && (
              <FormInput
                label={`${field.label}${field.required ? " *" : ""}`}
                type="date"
                value={data[field.key] as string}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
              />
            )}
          </div>
        ))}

        <div className="flex gap-3 pt-2">
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
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
