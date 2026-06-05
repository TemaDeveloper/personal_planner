// src/components/ui/stat-block.tsx
import { cn } from "@/lib/utils";

const sizeClasses = {
  hero: "text-4xl sm:text-5xl",
  lg: "text-2xl sm:text-3xl",
  md: "text-xl sm:text-2xl",
  sm: "text-lg",
} as const;

interface StatBlockProps {
  label: string;
  value: string;
  sub?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function StatBlock({ label, value, sub, size = "lg", className }: StatBlockProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="stat-label mb-1.5">{label}</p>
      <p className={cn("stat-value num", sizeClasses[size])}>{value}</p>
      {sub && <p className="mt-2 text-xs text-[var(--text-muted)] num truncate">{sub}</p>}
    </div>
  );
}
