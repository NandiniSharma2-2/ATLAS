import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  color?: "primary" | "accent" | "success" | "warning" | "danger";
}) {
  const ring = {
    primary: "border-primary/30 hover:border-primary/60 hover:shadow-[0_0_20px_oklch(0.86_0.18_200/20%)]",
    accent: "border-accent/30 hover:border-accent/60 hover:shadow-[0_0_20px_oklch(0.65_0.22_295/20%)]",
    success: "border-[var(--color-success)]/30 hover:border-[var(--color-success)]/60",
    warning: "border-[var(--color-warning)]/30 hover:border-[var(--color-warning)]/60",
    danger: "border-destructive/30 hover:border-destructive/60",
  }[color];

  const iconColor = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-destructive",
  }[color];

  return (
    <div
      className={cn(
        "glass-panel p-4 border transition-all duration-300 group",
        ring,
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className={cn("h-4 w-4", iconColor)} />
        {trend && (
          <span className="text-[10px] font-mono text-muted-foreground">{trend}</span>
        )}
      </div>
      <div className="font-display text-2xl font-bold leading-none">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
      </div>
      <div className="text-[11px] mt-1.5 font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
