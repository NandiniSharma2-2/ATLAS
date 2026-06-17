import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  getHealthData,
  seedDemoData,
} from "@/lib/atlas.functions";
import {
  unifiedHealthScore,
  burnoutRisk,
  trajectory,
  topDecisionActions,
  scoreSleep,
  scoreHydration,
  scoreActivity,
  scoreRecovery,
} from "@/lib/atlas-scoring";
import { Panel, PanelHeader } from "@/components/atlas/Panel";
import { ScoreRing } from "@/components/atlas/ScoreRing";
import { MetricCard } from "@/components/atlas/MetricCard";
import {
  Moon,
  Droplet,
  Footprints,
  HeartPulse,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Brain,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const healthDataQuery = queryOptions({
  queryKey: ["atlas", "health-data"],
  queryFn: () => getHealthData(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(healthDataQuery),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(healthDataQuery);
  const seedMut = useMutation({
    mutationFn: () => seedDemoData(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atlas"] }),
  });

  // Auto-seed if no data
  useEffect(() => {
    if (data.logs.length === 0 && !seedMut.isPending && !seedMut.isSuccess) {
      seedMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.logs.length]);

  if (data.logs.length === 0) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-pulse h-12 w-12 rounded-full bg-primary/20 grid place-items-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="font-display text-lg">Initializing your health OS…</div>
          <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
            Seeding 30 days of demo data
          </div>
        </div>
      </div>
    );
  }

  const today = data.logs[0];
  const yesterday = data.logs[1];
  const healthScore = unifiedHealthScore(today);
  const yHealthScore = yesterday ? unifiedHealthScore(yesterday) : healthScore;
  const burnout = burnoutRisk(data.logs);
  const traj = trajectory(data.logs);
  const actions = topDecisionActions(data.logs);

  const chartData = [...data.logs]
    .reverse()
    .map((l) => ({
      date: l.log_date.slice(5),
      score: unifiedHealthScore(l),
      sleep: l.sleep_hours ?? 0,
    }));

  const trendIcon =
    traj === "improving" ? TrendingUp : traj === "declining" ? TrendingDown : ArrowRight;
  const TrendIcon = trendIcon;
  const trendColor =
    traj === "improving"
      ? "text-[var(--color-success)]"
      : traj === "declining"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-1">
            Health Command Center
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {greet()},{" "}
            <span className="text-gradient">{data.fullName ?? "operator"}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-ring" />
          <span className="text-muted-foreground">System online · {data.logs.length} days logged</span>
        </div>
      </div>

      {/* PRIMARY SCORES ROW */}
      <Panel glow="cyan">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center justify-items-center">
          <ScoreRing value={healthScore} label="Health" size={140} />
          <ScoreRing value={scoreSleep(today.sleep_hours)} label="Sleep" color="accent" />
          <ScoreRing value={scoreHydration(today.hydration_ml)} label="Hydration" />
          <ScoreRing value={scoreActivity(today.steps)} label="Activity" color="success" />
          <ScoreRing
            value={scoreRecovery(today.recovery_score)}
            label="Recovery"
            color={today.recovery_score && today.recovery_score < 50 ? "warning" : "success"}
          />
        </div>
        <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <span className="font-mono uppercase tracking-wider text-xs">
              Trajectory: <span className={trendColor}>{traj}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
              Vs yesterday:
            </span>
            <span
              className={`font-mono text-sm ${healthScore - yHealthScore >= 0 ? "text-[var(--color-success)]" : "text-destructive"}`}
            >
              {healthScore - yHealthScore >= 0 ? "+" : ""}
              {healthScore - yHealthScore}
            </span>
          </div>
        </div>
      </Panel>

      {/* DECISION INTELLIGENCE + BURNOUT */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" glow="violet">
          <PanelHeader
            label="Decision Intelligence"
            title="Highest-ROI actions today"
            right={<Zap className="h-4 w-4 text-accent" />}
          />
          <div className="space-y-3">
            {actions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                You're hitting all targets. Maintain current routine.
              </div>
            ) : (
              actions.map((a, i) => (
                <div
                  key={i}
                  className="relative p-4 rounded-lg bg-background/40 border border-border hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-accent uppercase tracking-wider">
                          #{i + 1} · {a.confidence} confidence
                        </span>
                      </div>
                      <div className="font-display font-semibold">{a.action}</div>
                      <div className="text-xs text-muted-foreground mt-1">{a.reasoning}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-2xl font-bold text-[var(--color-success)]">
                        +{a.impact}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        health pts
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            label="Risk Radar"
            title="Burnout risk"
            right={<AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />}
          />
          <div className="flex flex-col items-center gap-2">
            <ScoreRing
              value={burnout}
              label="risk"
              size={140}
              color={burnout > 60 ? "danger" : burnout > 35 ? "warning" : "success"}
            />
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-center leading-relaxed">
            {burnout > 60
              ? "Elevated burnout signal. Prioritize sleep and rest today."
              : burnout > 35
                ? "Moderate strain. Monitor recovery."
                : "Within healthy range. Keep your rhythm."}
          </div>
        </Panel>
      </div>

      {/* TODAY'S METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Moon}
          label="Sleep"
          value={today.sleep_hours?.toFixed(1) ?? "—"}
          unit="h"
          color="accent"
          trend={yesterday ? deltaStr((today.sleep_hours ?? 0) - (yesterday.sleep_hours ?? 0), "h", 1) : undefined}
        />
        <MetricCard
          icon={Droplet}
          label="Hydration"
          value={today.hydration_ml ?? "—"}
          unit="ml"
          color="primary"
        />
        <MetricCard
          icon={Footprints}
          label="Steps"
          value={today.steps?.toLocaleString() ?? "—"}
          color="success"
        />
        <MetricCard
          icon={HeartPulse}
          label="Mood"
          value={today.mood ?? "—"}
          unit="/10"
          color="warning"
        />
      </div>

      {/* TRENDS CHART */}
      <Panel>
        <PanelHeader
          label="Weekly Trends"
          title="Health score · 30-day trajectory"
          right={<Brain className="h-4 w-4 text-primary" />}
        />
        <div className="h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.86 0.18 200)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="oklch(0.86 0.18 200)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.4 0.08 250 / 18%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.7 0.04 240)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: "oklch(0.7 0.04 240)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.18 0.04 270)",
                  border: "1px solid oklch(0.4 0.08 250 / 50%)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: "oklch(0.86 0.18 200)", fontFamily: "JetBrains Mono" }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="oklch(0.86 0.18 200)"
                strokeWidth={2}
                fill="url(#scoreGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Late session";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function deltaStr(diff: number, unit: string, digits = 0) {
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(digits)}${unit}`;
}
