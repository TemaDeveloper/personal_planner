import { cn } from "@/lib/utils";

const variantClasses = {
  default: "surface-card",
  elevated: "surface-elevated",
  inset: "surface-inset",
} as const;

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
  interactive?: boolean;
  padding?: keyof typeof paddingClasses;
}

export function Card({
  variant = "default",
  interactive = false,
  padding = "lg",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        interactive && "interactive cursor-pointer hover:scale-[1.01] transition-transform duration-150",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
