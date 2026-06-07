"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

interface FieldDef {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  required?: boolean;
  formula?: string;
}

interface CustomFieldsData {
  extraFields: FieldDef[];
  values: Record<string, unknown>;
  dateKey: string;
}

export function SectionCustomFields({ sectionKey }: { sectionKey: string }) {
  const [data, setData] = useState<CustomFieldsData | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sections/${sectionKey}/custom-fields`)
      .then((r) => r.json())
      .then((json: CustomFieldsData) => {
        if (cancelled) return;
        setData(json);
        setLocalValues(json.values ?? {});
      })
      .catch(() => {
        // Silently ignore — the page must not crash
      });
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  const saveField = useCallback(
    async (fieldKey: string, value: unknown) => {
      setSaving((prev) => ({ ...prev, [fieldKey]: true }));
      try {
        const res = await fetch(`/api/sections/${sectionKey}/custom-fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fieldKey, value }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error ?? "Failed to save");
        }
      } catch {
        toast.error("Failed to save");
      } finally {
        setSaving((prev) => ({ ...prev, [fieldKey]: false }));
      }
    },
    [sectionKey]
  );

  // Not yet loaded or no extra fields — render nothing
  if (!data || data.extraFields.length === 0) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Additional fields
      </h2>
      <div className="flex flex-col gap-4">
        {data.extraFields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={localValues[field.key]}
            isSaving={saving[field.key] ?? false}
            onChange={(val) =>
              setLocalValues((prev) => ({ ...prev, [field.key]: val }))
            }
            onSave={(val) => saveField(field.key, val)}
          />
        ))}
      </div>
    </Card>
  );
}

/* ── Individual field input ── */

interface FieldInputProps {
  field: FieldDef;
  value: unknown;
  isSaving: boolean;
  onChange: (val: unknown) => void;
  onSave: (val: unknown) => void;
}

function FieldInput({ field, value, isSaving, onChange, onSave }: FieldInputProps) {
  const baseStyle = isSaving ? "opacity-60" : "";

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between min-h-[44px]">
        <label className="text-xs font-medium text-[var(--text-muted)]">
          {field.label}
        </label>
        <ToggleSwitch
          checked={Boolean(value)}
          onChange={(checked) => {
            onChange(checked);
            onSave(checked);
          }}
          disabled={isSaving}
        />
      </div>
    );
  }

  if (field.type === "select" && field.options && field.options.length > 0) {
    return (
      <div className={baseStyle}>
        <FormSelect
          label={field.label}
          value={String(value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
            onSave(val);
          }}
          disabled={isSaving}
        >
          <option value="">—</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </FormSelect>
      </div>
    );
  }

  // number, text, date
  const inputType =
    field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

  return (
    <div className={baseStyle}>
      <FormInput
        label={field.label}
        type={inputType}
        value={String(value ?? "")}
        className={field.type === "number" ? "num" : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onSave(e.target.value === "" ? null : e.target.value)}
        disabled={isSaving}
      />
    </div>
  );
}
