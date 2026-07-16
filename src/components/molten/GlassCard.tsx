import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, strong, hover = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(strong ? "glass-strong" : "glass", hover && "glass-hover", className)}
      {...props}
    />
  ),
);
GlassCard.displayName = "GlassCard";