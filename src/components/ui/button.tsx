import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110",
  secondary:
    "text-foreground hover:brightness-110",
  ghost:
    "text-muted-foreground hover:text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:brightness-110",
  outline:
    "border border-[var(--border-subtle)] text-foreground bg-transparent hover:bg-[var(--surface-1)]",
} as const;

const sizeClasses = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
  lg: "h-10 px-5 text-sm gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-lg",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-150",
          "active:scale-[0.98]",
          "disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variantClasses[variant],
          variant === "secondary" && "surface-inset",
          variant === "ghost" && "hover:bg-[var(--surface-1)]",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
