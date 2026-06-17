import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getHealthData } from "@/lib/atlas.functions";
import type { DailyLog } from "@/lib/atlas-scoring";
import { Panel, PanelHeader } from "@/components/atlas/Panel";
import {
  unifiedHealthScore,
  burnoutRisk,
  trajectory,
} from "@/lib/atlas-scoring";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Brain, GitBranch, Sparkles } from "lucide-react";

const healthDataQuery = queryOptions({
  queryKey: ["atlas", "health-data"],
  queryFn: () => getHealthData(),
});

export const Route = createFileRoute("/_authenticated/memory")({
  head: () => ({
    meta: [{ title: "Health Memory · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(healthDataQuery),
  component: Memory,
});

type Correlation = {
  title: string;
  detail: string;
  delta: string;
  positive: boolean;
};

function deriveCorrelations(logs: DailyLog[]): Correlation[] {
  if (logs.length < 7) return [];
  const sleepSorted = [...logs].sort((a, b) => (a.sleep_hours ?? 0) - (b.sleep_hours ?? 0));
  const low = sleepSorted.slice(0, Math.floor(logs.length / 2));
  const high = sleepSorted.slice(Math.floor(logs.length / 2));
  const avg = (arr: DailyLog[], key: keyof DailyLog) =>
    arr.reduce((s: number, l) => s + Number(l[key] ?? 0), 0) / Math.max(1, arr.length);

  const moodLow = avg(low, "mood");
  const moodHigh = avg(high, "mood");
  const recoveryLow = avg(low, "recovery_score");
  const recoveryHigh = avg(high, "recovery_score");
  const stepsLow = avg(low, "steps");
  const stepsHigh = avg(high, "steps");

  return [
    {
      title: "Sleep ↑ → Mood ↑",
      detail: `Days with above-median sleep show ${(moodHigh - moodLow).toFixed(1)} higher mood (/10).`,
      delta: `+${(moodHigh - moodLow).toFixed(1)}`,
      positive: moodHigh > moodLow,
    },
    {
      title: "Sleep ↑ → Recovery ↑",
      detail: `High-sleep days average ${Math.round(recoveryHigh)} recovery vs ${Math.round(recoveryLow)} on low-sleep days.`,
      delta: `+${Math.round(recoveryHigh - recoveryLow)}`,
      positive: recoveryHigh > recoveryLow,
    },
    {
      title: "Sleep ↑ → Activity ↑",
      detail: `Rested days average ${Math.round(stepsHigh)} steps; low-sleep days drop to ${Math.round(stepsLow)}.`,
      delta: `+${Math.round(stepsHigh - stepsLow)}`,
      positive: stepsHigh > stepsLow,
    },
  ];
}

function Memory() {
  const { data } = useSuspenseQuery(healthDataQuery);
  const logs = data.logs;

  if (logs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No memory yet. Visit the dashboard to seed data.</div>
    );
  }

  const correlations = deriveCorrelations(logs);
  const weightSeries = [...logs].reverse().map((l) => ({
    date: l.log_date.slice(5),
    weight: l.weight_kg ?? null,
  }));
  const moodSeries = [...logs].reverse().map((l) => ({
    date: l.log_date.slice(5),
    mood: l.mood ?? 0,
  }));
  const sleepSeries = [...logs].reverse().map((l) => ({
    date: l.log_date.slice(5),
    sleep: l.sleep_hours ?? 0,
  }));

  const avgScore = Math.round(
    logs.reduce((s, l) => s + unifiedHealthScore(l), 0) / logs.length,
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-1">
          Health Memory Engine
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          Your <span className="text-gradient">behavioral model</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          ATLAS continuously analyzes your patterns to surface relationships between sleep,
          activity, mood, and recovery — so the system understands *you*, not averages.
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryStat label="30d avg score" value={avgScore} />
        <SummaryStat
          label="Trajectory"
          value={trajectory(logs)}
          mono
        />
        <SummaryStat label="Burnout risk" value={burnoutRisk(logs)} suffix="/100" />
        <SummaryStat label="Logged days" value={logs.length} />
      </div>

      {/* CORRELATIONS */}
      <Panel glow="violet">
        <PanelHeader
          label="Pattern Detection"
          title="Behavioral correlations"
          right={<GitBranch className="h-4 w-4 text-accent" />}
        />
        <div className="grid md:grid-cols-3 gap-3">
          {correlations.map((c) => (
            <div
              key={c.title}
              className="p-4 rounded-lg bg-background/40 border border-border"
            >
              <div className="font-display font-semibold text-sm mb-1">{c.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{c.detail}</div>
              <div
                className={`mt-3 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider ${c.positive ? "text-[var(--color-success)]" : "text-destructive"}`}
              >
                <Sparkles className="h-3 w-3" />
                {c.delta} delta
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* SERIES */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader label="Sleep" title="Hours per night · 30d" />
          <ChartFrame>
            <LineChart data={sleepSeries}>
              <CartesianGrid stroke="oklch(0.4 0.08 250 / 18%)" vertical={false} />
              <XAxis dataKey="date" {...axisStyle()} interval={4} />
              <YAxis {...axisStyle()} domain={[0, 10]} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Line
                type="monotone"
                dataKey="sleep"
                stroke="oklch(0.65 0.22 295)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartFrame>
        </Panel>

        <Panel>
          <PanelHeader label="Weight" title="Kg trend · 30d" />
          <ChartFrame>
            <LineChart data={weightSeries}>
              <CartesianGrid stroke="oklch(0.4 0.08 250 / 18%)" vertical={false} />
              <XAxis dataKey="date" {...axisStyle()} interval={4} />
              <YAxis {...axisStyle()} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="oklch(0.86 0.18 200)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartFrame>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            label="Mood"
            title="Daily mood / 10"
            right={<Brain className="h-4 w-4 text-primary" />}
          />
          <ChartFrame height={220}>
            <BarChart data={moodSeries}>
              <CartesianGrid stroke="oklch(0.4 0.08 250 / 18%)" vertical={false} />
              <XAxis dataKey="date" {...axisStyle()} interval={3} />
              <YAxis {...axisStyle()} domain={[0, 10]} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Bar dataKey="mood" fill="oklch(0.72 0.2 240)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
        </Panel>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  suffix,
  mono,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  mono?: boolean;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className={`font-display text-2xl font-bold ${mono ? "capitalize" : ""}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function ChartFrame({ children, height = 240 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ height }} className="-mx-2">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const axisStyle = () => ({
  tick: { fill: "oklch(0.7 0.04 240)", fontSize: 11, fontFamily: "JetBrains Mono" } as const,
  tickLine: false,
  axisLine: false,
});

const tooltipStyle = {
  background: "oklch(0.18 0.04 270)",
  border: "1px solid oklch(0.4 0.08 250 / 50%)",
  borderRadius: 10,
  fontSize: 12,
} as const;

const labelStyle = {
  color: "oklch(0.86 0.18 200)",
  fontFamily: "JetBrains Mono",
} as const;
