import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { getHealthData, analyzeHealthTrends, findHealthCorrelations } from "@/lib/atlas.functions";
import { 
  useHealthTrends, 
  useHealthCorrelations, 
  useUserHabits,
  useInvalidateAtlasData 
} from "@/hooks/useHealthInsights";
import { Panel, PanelHeader } from "@/components/atlas/Panel";
import { ScoreRing } from "@/components/atlas/ScoreRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Lightbulb,
  AlertCircle,
  BarChart3,
  Zap,
  Calendar,
  Target,
  Flame,
  RotateCcw
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from "recharts";

const healthDataQuery = queryOptions({
  queryKey: ["atlas", "health-data"],
  queryFn: () => getHealthData(),
});

export const Route = createFileRoute("/_authenticated/health-insights")({
  head: () => ({
    meta: [{ title: "Health Insights · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(healthDataQuery),
  component: HealthInsightsPage,
});

function HealthInsightsPage() {
  const { data: healthData } = useSuspenseQuery(healthDataQuery);
  const [analysisDepth, setAnalysisDepth] = useState<7 | 30 | 90>(30);
  
  const healthTrends = useHealthTrends(analysisDepth);
  const correlations = useHealthCorrelations(0.3);
  const habits = useUserHabits();
  const invalidate = useInvalidateAtlasData();
  
  const qc = useQueryClient();
  const refreshAnalysisMutation = useMutation({
    mutationFn: () => analyzeHealthTrends({ days: analysisDepth }),
    onSuccess: () => {
      invalidate.invalidateInsights();
    }
  });

  const insights = healthTrends.data?.insights || [];
  const trends = healthTrends.data?.trends || [];
  const correlationData = correlations.data?.correlations || [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-1">
            Health Intelligence Center
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Deep</span> Health Analysis
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            AI-powered pattern detection, correlations, and personalized insights from your health data.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={analysisDepth === days ? "default" : "outline"}
                size="sm"
                onClick={() => setAnalysisDepth(days as 7 | 30 | 90)}
                className="text-xs font-mono"
              >
                {days}d
              </Button>
            ))}
          </div>
          <Button
            onClick={() => refreshAnalysisMutation.mutate()}
            disabled={refreshAnalysisMutation.isPending}
            variant="outline"
            className="border-accent/50 hover:border-accent text-accent"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${refreshAnalysisMutation.isPending ? 'animate-spin' : ''}`} />
            {refreshAnalysisMutation.isPending ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
      </div>

      {healthData.logs.length < 7 ? (
        <Panel>
          <div className="text-center py-12 space-y-4">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div className="space-y-2">
              <div className="font-display text-lg text-muted-foreground">
                Insufficient data for analysis
              </div>
              <div className="text-sm text-muted-foreground max-w-md mx-auto">
                You need at least 7 days of health data to unlock AI-powered insights and pattern detection.
              </div>
            </div>
            <Badge variant="outline" className="font-mono">
              {healthData.logs.length}/7 days logged
            </Badge>
          </div>
        </Panel>
      ) : (
        <Tabs defaultValue="insights" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-background/50 border border-border">
            <TabsTrigger value="insights" className="text-xs font-mono uppercase tracking-wider">
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs font-mono uppercase tracking-wider">
              Trends
            </TabsTrigger>
            <TabsTrigger value="correlations" className="text-xs font-mono uppercase tracking-wider">
              Correlations
            </TabsTrigger>
            <TabsTrigger value="habits" className="text-xs font-mono uppercase tracking-wider">
              Habits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-6">
            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            ) : (
              <Panel>
                <div className="text-center py-8 space-y-4">
                  <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <div className="text-muted-foreground">
                    {healthTrends.isLoading ? 'Analyzing patterns...' : 'No insights found yet.'}
                  </div>
                </div>
              </Panel>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {trends.length > 0 ? (
              <>
                {/* Trend Overview */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {trends.map((trend) => (
                    <TrendCard key={trend.metric} trend={trend} />
                  ))}
                </div>

                {/* Trend Visualization */}
                <Panel>
                  <PanelHeader
                    label="Trend Analysis"
                    title="Metric trajectories"
                    right={<BarChart3 className="h-4 w-4 text-primary" />}
                  />
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={generateTrendChartData(healthData.logs, analysisDepth)}>
                        <defs>
                          <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="oklch(0.4 0.08 250 / 18%)" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{
                            background: "oklch(0.18 0.04 270)",
                            border: "1px solid oklch(0.4 0.08 250 / 50%)",
                            borderRadius: 10,
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="sleep"
                          stroke="var(--color-accent)"
                          fill="url(#sleepGrad)"
                          name="Sleep (hours)"
                        />
                        <Area
                          type="monotone"
                          dataKey="steps"
                          stroke="var(--color-success)"
                          fill="url(#stepsGrad)"
                          name="Steps (thousands)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </>
            ) : (
              <Panel>
                <div className="text-center py-8 text-muted-foreground">
                  No trends detected yet. More data needed for trend analysis.
                </div>
              </Panel>
            )}
          </TabsContent>

          <TabsContent value="correlations" className="space-y-6">
            {correlationData.length > 0 ? (
              <>
                <div className="grid gap-4">
                  {correlationData.map((corr, i) => (
                    <CorrelationCard key={i} correlation={corr} />
                  ))}
                </div>

                {/* Correlation Matrix Visualization */}
                <Panel>
                  <PanelHeader
                    label="Correlation Matrix"
                    title="Health metric relationships"
                    right={<Activity className="h-4 w-4 text-accent" />}
                  />
                  <div className="text-center py-8 text-muted-foreground">
                    Correlation matrix visualization coming soon...
                  </div>
                </Panel>
              </>
            ) : (
              <Panel>
                <div className="text-center py-8 space-y-4">
                  <Activity className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <div className="text-muted-foreground">
                    {correlations.isLoading ? 'Finding correlations...' : 'No significant correlations found.'}
                  </div>
                </div>
              </Panel>
            )}
          </TabsContent>

          <TabsContent value="habits" className="space-y-6">
            {habits.data?.habits && habits.data.habits.length > 0 ? (
              <div className="grid gap-4">
                {habits.data.habits.map((habit) => (
                  <HabitAnalysisCard key={habit.id} habit={habit} />
                ))}
              </div>
            ) : (
              <Panel>
                <div className="text-center py-8 space-y-4">
                  <Target className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <div className="text-muted-foreground">
                    No habits tracked yet. Start tracking habits to see consistency analysis.
                  </div>
                </div>
              </Panel>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface InsightCardProps {
  insight: {
    type: string;
    title: string;
    description: string;
    confidence: number;
  };
}

function InsightCard({ insight }: InsightCardProps) {
  const icons = {
    trend: TrendingUp,
    pattern: Activity,
    correlation: Lightbulb,
    anomaly: AlertCircle,
  };

  const colors = {
    trend: "text-[var(--color-success)]",
    pattern: "text-primary",
    correlation: "text-accent",
    anomaly: "text-[var(--color-warning)]",
  };

  const IconComponent = icons[insight.type as keyof typeof icons] || Lightbulb;
  const iconColor = colors[insight.type as keyof typeof colors] || "text-primary";

  return (
    <Panel>
      <div className="flex items-start gap-4">
        <div className={`mt-1 ${iconColor}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-[10px] font-mono uppercase">
              {insight.type}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {Math.round(insight.confidence * 100)}% confidence
            </Badge>
          </div>
          <h3 className="font-display font-semibold mb-2">{insight.title}</h3>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
        </div>
      </div>
    </Panel>
  );
}

interface TrendCardProps {
  trend: {
    metric: string;
    direction: string;
    change_percentage: number;
    confidence: number;
  };
}

function TrendCard({ trend }: TrendCardProps) {
  const TrendIcon = trend.direction === 'improving' ? TrendingUp : 
                   trend.direction === 'declining' ? TrendingDown : Activity;
  
  const trendColor = trend.direction === 'improving' ? 'text-[var(--color-success)]' :
                    trend.direction === 'declining' ? 'text-destructive' : 'text-muted-foreground';

  const metricLabels: Record<string, string> = {
    sleep_hours: 'Sleep',
    steps: 'Activity', 
    hydration_ml: 'Hydration',
    mood: 'Mood',
    recovery_score: 'Recovery',
    nutrition_score: 'Nutrition'
  };

  return (
    <Panel>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {metricLabels[trend.metric] || trend.metric}
          </span>
        </div>
        <div className={`font-display text-2xl font-bold ${trendColor}`}>
          {trend.change_percentage > 0 ? '+' : ''}{trend.change_percentage.toFixed(1)}%
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {Math.round(trend.confidence * 100)}% confidence
        </div>
      </div>
    </Panel>
  );
}

interface CorrelationCardProps {
  correlation: {
    factor_a: string;
    factor_b: string;
    correlation: number;
    strength: string;
    description: string;
    sample_size: number;
  };
}

function CorrelationCard({ correlation }: CorrelationCardProps) {
  const strengthColors = {
    strong: 'text-[var(--color-success)]',
    moderate: 'text-[var(--color-warning)]',
    weak: 'text-muted-foreground'
  };

  const strengthColor = strengthColors[correlation.strength as keyof typeof strengthColors] || 'text-muted-foreground';

  return (
    <Panel>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`text-[10px] font-mono ${strengthColor}`}>
              {correlation.strength} correlation
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              n={correlation.sample_size}
            </span>
          </div>
          <p className="font-display font-semibold mb-1">{correlation.description}</p>
          <p className="text-xs text-muted-foreground">
            {correlation.factor_a} ↔ {correlation.factor_b}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-display text-xl font-bold ${strengthColor}`}>
            {correlation.correlation > 0 ? '+' : ''}{correlation.correlation.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">correlation</div>
        </div>
      </div>
    </Panel>
  );
}

interface HabitAnalysisCardProps {
  habit: any; // Type from habit analysis
}

function HabitAnalysisCard({ habit }: HabitAnalysisCardProps) {
  const analysis = habit.consistency_analysis;
  
  return (
    <Panel>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              {habit.category}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {habit.frequency_period}
            </Badge>
          </div>
          <h3 className="font-display font-semibold mb-2">{habit.name}</h3>
          
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="text-muted-foreground">Completion Rate</div>
              <div className="font-mono font-bold">
                {(analysis.completion_rate * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Current Streak</div>
              <div className="font-mono font-bold text-accent">
                {analysis.streak_current}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Best Streak</div>
              <div className="font-mono font-bold text-[var(--color-success)]">
                {analysis.streak_longest}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <ScoreRing 
            value={analysis.consistency_score} 
            label="Consistency" 
            size={80}
            color={analysis.consistency_score > 80 ? "success" : analysis.consistency_score > 60 ? "warning" : "primary"}
          />
        </div>
      </div>
    </Panel>
  );
}

// Helper functions
function generateTrendChartData(logs: any[], days: number) {
  return logs
    .slice(0, days)
    .reverse()
    .map(log => ({
      date: log.log_date.slice(5),
      sleep: log.sleep_hours || 0,
      steps: (log.steps || 0) / 1000, // Convert to thousands for better scale
      mood: log.mood || 0,
      hydration: (log.hydration_ml || 0) / 100 // Convert to hundreds for better scale
    }));
}