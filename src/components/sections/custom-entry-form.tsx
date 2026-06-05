"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
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
                <label className="block stat-label mb-2">
                  {field.label}{field.required && " *"}
                </label>
                <div className="flex items-center gap-3">
                  <ToggleSwitch
                    checked={!!data[field.key]}
                    onChange={(checked) => updateField(field.key, checked)}
                    size="md"
                  />
                  <span className="text-sm text-[var(--text-muted)]">
                    {data[field.key] ? "Yes" : "No"}
                  </span>
                </div>
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
