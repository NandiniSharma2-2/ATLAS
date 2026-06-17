import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getHealthData,
  seedDemoData,
} from "@/lib/atlas.functions";
import {
  useHealthTrends,
  useHealthCorrelations,
  useFutureProjection,
  useGenerateRecommendations,
  useRecommendations,
  useUserHabits,
  useInvalidateAtlasData,
} from "@/hooks/useHealthInsights";
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
import { HealthInsightCard } from "@/components/atlas/HealthInsightCard";
import { FutureProjectionCard } from "@/components/atlas/FutureProjectionCard";
import { RecommendationCard } from "@/components/atlas/RecommendationCard";
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
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/enhanced-dashboard")({
  head: () => ({
    meta: [{ title: "Enhanced Dashboard · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(healthDataQuery),
  component: EnhancedDashboard,
});

function EnhancedDashboard() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(healthDataQuery);
  const [activeTab, setActiveTab] = useState("overview");
  const invalidate = useInvalidateAtlasData();
  
  // New backend hooks
  const healthTrends = useHealthTrends(30);
  const correlations = useHealthCorrelations(0.3);
  const futureProjection = useFutureProjection('30_day', ['realistic']);
  const recommendations = useRecommendations({ limit: 5 });
  const habits = useUserHabits();
  
  const generateRecommendationsMutation = useGenerateRecommendations();
  
  const seedMut = useMutation({
    mutationFn: () => seedDemoData(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atlas"] });
      // Also trigger new insights after seeding
      setTimeout(() => {
        generateRecommendationsMutation.mutate({
          categories: ['sleep', 'exercise', 'nutrition', 'hydration'],
          max_recommendations: 5
        });
      }, 1000);
    },
  });

  // Auto-seed if no data
  useEffect(() => {
    if (data.logs.length === 0 && !seedMut.isPending && !seedMut.isSuccess) {
      seedMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.logs.length]);

  // Generate initial recommendations if we have data but no recommendations
  useEffect(() => {
    if (data.logs.length > 7 && 
        !recommendations.data?.recommendations?.length && 
        !recommendations.isLoading &&
        !generateRecommendationsMutation.isPending) {
      generateRecommendationsMutation.mutate({
        categories: ['sleep', 'exercise', 'nutrition', 'hydration'],
        max_recommendations: 5
      });
    }
  }, [data.logs.length, recommendations.data?.recommendations?.length]);

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

  // Handle recommendation actions
  const handleAcceptRecommendation = (id: string) => {
    // TODO: Implement recommendation acceptance logic
    console.log('Accepted recommendation:', id);
  };

  const handleRejectRecommendation = (id: string) => {
    // TODO: Implement recommendation rejection logic  
    console.log('Rejected recommendation:', id);
  };

  const handleGenerateProjection = () => {
    // Future projections are automatically generated via the hook
    invalidate.invalidateProjections();
  };

  const handleGenerateRecommendations = () => {
    generateRecommendationsMutation.mutate({
      categories: ['sleep', 'exercise', 'nutrition', 'hydration', 'stress'],
      max_recommendations: 7
    });
  };

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
        <div className="flex items-center gap-4">
          {/* AI Status Indicators */}
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
            {healthTrends.data?.insights?.length > 0 && (
              <Badge variant="outline" className="text-[10px] border-accent/50 text-accent">
                <Brain className="h-2 w-2 mr-1" />
                {healthTrends.data.insights.length} insights
              </Badge>
            )}
            {recommendations.data?.recommendations?.length > 0 && (
              <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
                <Sparkles className="h-2 w-2 mr-1" />
                {recommendations.data.recommendations.length} recommendations
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-ring" />
            <span className="text-muted-foreground">System online · {data.logs.length} days logged</span>
          </div>
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

      {/* ENHANCED INSIGHTS SECTION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-background/50 border border-border">
          <TabsTrigger value="overview" className="text-xs font-mono uppercase tracking-wider">
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs font-mono uppercase tracking-wider">
            Insights
          </TabsTrigger>
          <TabsTrigger value="future" className="text-xs font-mono uppercase tracking-wider">
            Future-Me
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs font-mono uppercase tracking-wider">
            AI Coaching
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <HealthInsightCard 
            insights={healthTrends.data?.insights || []}
            isLoading={healthTrends.isLoading}
          />
          
          {/* Correlations Panel */}
          {correlations.data?.correlations?.length > 0 && (
            <Panel>
              <PanelHeader
                label="Pattern Discovery"
                title="Health correlations found"
                right={<Brain className="h-4 w-4 text-accent" />}
              />
              <div className="space-y-3">
                {correlations.data.correlations.slice(0, 3).map((corr, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-background/40 border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{corr.description}</div>
                      <Badge 
                        variant="outline" 
                        className={`font-mono text-[10px] ${
                          Math.abs(corr.correlation) > 0.7 ? 'text-[var(--color-success)]' :
                          Math.abs(corr.correlation) > 0.5 ? 'text-[var(--color-warning)]' :
                          'text-muted-foreground'
                        }`}
                      >
                        {corr.strength} ({Math.abs(corr.correlation).toFixed(2)})
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </TabsContent>

        <TabsContent value="future" className="space-y-6">
          <FutureProjectionCard 
            projection={futureProjection.data?.projections?.[0]}
            isLoading={futureProjection.isLoading}
            onGenerateProjection={handleGenerateProjection}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationCard 
            recommendations={recommendations.data?.recommendations}
            isLoading={recommendations.isLoading || generateRecommendationsMutation.isPending}
            onGenerateRecommendations={handleGenerateRecommendations}
            onAcceptRecommendation={handleAcceptRecommendation}
            onRejectRecommendation={handleRejectRecommendation}
          />
        </TabsContent>
      </Tabs>

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