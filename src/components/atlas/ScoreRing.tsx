import { cn } from "@/lib/utils";

export function ScoreRing({
  value,
  label,
  size = 132,
  color = "primary",
}: {
  value: number;
  label: string;
  size?: number;
  color?: "primary" | "accent" | "success" | "warning" | "danger";
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  const stroke = {
    primary: "stroke-primary",
    accent: "stroke-accent",
    success: "stroke-[var(--color-success)]",
    warning: "stroke-[var(--color-warning)]",
    danger: "stroke-destructive",
  }[color];

  const text = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-destructive",
  }[color];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={8}
            fill="none"
            className="stroke-muted/40"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={cn(stroke, "transition-all duration-700")}
            style={{
              filter: `drop-shadow(0 0 8px currentColor)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className={cn("font-display text-3xl font-bold leading-none", text)}>
              {Math.round(v)}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">
              /100
            </div>
          </div>
        </div>
      </div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
