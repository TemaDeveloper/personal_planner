import { type InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function FormInput({ label, className = "", ...props }: FormInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${className}`}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
        }}
        {...props}
      />
    </div>
  );
}
