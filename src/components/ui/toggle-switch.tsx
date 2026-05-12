"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

const sizes = {
  sm: { track: "w-9 h-5", thumb: "w-4 h-4", translate: 16 },
  md: { track: "w-11 h-6", thumb: "w-5 h-5", translate: 20 },
};

export function ToggleSwitch({
  checked,
  onChange,
  size = "md",
  disabled = false,
  className,
}: ToggleSwitchProps) {
  const s = sizes[size];

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center rounded-full p-0.5 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        s.track,
        checked
          ? "bg-[var(--accent-color)]"
          : "bg-[var(--surface-1)] border border-[var(--border-subtle)]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <motion.span
        className={cn(
          "block rounded-full shadow-sm",
          s.thumb,
          checked ? "bg-white" : "bg-[var(--text-muted)]"
        )}
        animate={{ x: checked ? s.translate : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
