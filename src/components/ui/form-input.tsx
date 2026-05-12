import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ── Label ── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
      {children}
    </label>
  );
}

/* ── FormInput ── */
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <input
          ref={ref}
          className={cn(
            "form-input",
            error && "border-destructive focus:ring-destructive/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

/* ── FormSelect ── */
interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, className, children, ...props }, ref) => {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <select
          ref={ref}
          className={cn(
            "form-input appearance-none cursor-pointer",
            "bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat",
            error && "border-destructive focus:ring-destructive/20",
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2386868B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            paddingRight: "2rem",
          }}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";

/* ── FormTextarea ── */
interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <textarea
          ref={ref}
          className={cn(
            "form-input resize-none",
            error && "border-destructive focus:ring-destructive/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);
FormTextarea.displayName = "FormTextarea";
