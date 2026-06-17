import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "violet";
}) {
  return (
    <div
      className={cn(
        "glass-panel p-5 md:p-6 relative overflow-hidden",
        glow === "cyan" && "glow-cyan",
        glow === "violet" && "glow-violet",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  label,
  title,
  right,
}: {
  label?: string;
  title?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        {label && (
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary/80 mb-1">
            {label}
          </div>
        )}
        {title && <h3 className="font-display text-lg font-semibold">{title}</h3>}
      </div>
      {right}
    </div>
  );
}
