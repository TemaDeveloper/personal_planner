import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  size?: "sm" | "md";
  color?: string;
  showLabel?: boolean;
  className?: string;
}

export function Progress({
  value,
  size = "sm",
  color,
  showLabel = false,
  className,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 rounded-full overflow-hidden bg-[var(--border-subtle)]",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            background: color || "var(--accent-color)",
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums min-w-[2.5rem] text-right">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
