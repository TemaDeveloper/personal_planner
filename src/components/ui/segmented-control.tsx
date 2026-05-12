"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  layoutId?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className,
  layoutId = "segment-indicator",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-lg",
        "bg-[var(--surface-1)] border border-[var(--border-subtle)]",
        className
      )}
    >
      {segments.map((seg) => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            onClick={() => onChange(seg.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150",
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-md surface-card"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {seg.icon && <seg.icon size={14} />}
              {seg.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
