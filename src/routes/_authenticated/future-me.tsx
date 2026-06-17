import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { getHealthData, generateFutureProjection, getUserGoals } from "@/lib/atlas.functions";
import { useFutureProjection, useUserGoals } from "@/hooks/useHealthInsights";
import { Panel, PanelHeader } from "@/components/atlas/Panel";
import { ScoreRing } from "@/components/atlas/ScoreRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gem, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";

const healthDataQuery = queryOptions({
  queryKey: ["atlas", "health-data"],
  queryFn: () => getHealthData(),
});

export const Route = createFileRoute("/_authenticated/future-me")({
  head: () => ({
    meta: [{ title: "Future-Me Simulator · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(healthDataQuery),
  component: FutureMePage,
});

function FutureMePage() {
  const { data: healthData } = useSuspenseQuery(healthDataQuery);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30_day' | '6_month' | '1_year'>('30_day');
  const [selectedScenarios, setSelectedScenarios] = useState<Array<'best_case' | 'realistic' | 'worst_case'>>(['realistic']);
  
  const projection = useFutureProjection(selectedTimeframe, selectedScenarios);
  const goals = useUserGoals('active');
  
  const qc = useQueryClient();
  const generateProjectionMutation = useMutation({
    mutationFn: generateFutureProjection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atlas", "future-projection"] });
    }
  });

  const timeframeLabels = {
    '30_day': '30 Days',
    '6_month': '6 Months', 
    '1_year': '1 Year'
  };

  const scenarioLabels = {
    'best_case': 'Best Case',
    'realistic': 'Realistic',
    'worst_case': 'Worst Case'
  };

  const scenarioColors = {
    'best_case': 'text-[var(--color-success)]',
    'realistic': 'text-primary',
    'worst_case': 'text-destructive'
  };

  const handleGenerateProjection = () => {
    generateProjectionMutation.mutate({
      projection_type: selectedTimeframe,
      scenario_types: selectedScenarios,
      include_goals: true
    });
  };

  const projectionData = projection.data?.projections || [];
  const currentHealthScore = healthData.logs.length > 0 ? 
    require("@/lib/atlas-scoring").unifiedHealthScore(healthData.logs[0]) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-1">
            Future-Me Simulator
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Predict</span> Your Health Journey
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            AI-powered projections based on your patterns, goals, and behavioral trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-accent" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Quantum Health Modeling
          </span>
        </div>
      </div>

      {/* CONTROLS */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                Time Horizon
              </label>
              <div className="flex gap-2">
                {(['30_day', '6_month', '1_year'] as const).map((timeframe) => (
                  <Button
                    key={timeframe}
                    variant={selectedTimeframe === timeframe ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTimeframe(timeframe)}
                    className="text-xs font-mono"
                  >
                    {timeframeLabels[timeframe]}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                Scenarios
              </label>
              <div className="flex gap-2">
                {(['best_case', 'realistic', 'worst_case'] as const).map((scenario) => (
                  <Button
                    key={scenario}
                    variant={selectedScenarios.includes(scenario) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectedScenarios.includes(scenario)) {
                        setSelectedScenarios(prev => prev.filter(s => s !== scenario));
                      } else {
                        setSelectedScenarios(prev => [...prev, scenario]);
                      }
                    }}
                    className={`text-xs font-mono ${scenarioColors[scenario]}`}
                  >
                    {scenarioLabels[scenario]}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerateProjection}
            disabled={generateProjectionMutation.isPending || selectedScenarios.length === 0}
            className="bg-accent hover:bg-accent/80"
          >
            <Zap className="h-4 w-4 mr-2" />
            {generateProjectionMutation.isPending ? 'Generating...' : 'Generate Projection'}
          </Button>
        </div>
      </Panel>

      <Tabs defaultValue="projection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-background/50 border border-border">
          <TabsTrigger value="projection" className="text-xs font-mono uppercase tracking-wider">
            Health Projection
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs font-mono uppercase tracking-wider">
            Goal Tracking
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="text-xs font-mono uppercase tracking-wider">
            What-If Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projection" className="space-y-6">
          {projectionData.length > 0 ? (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* MAIN PROJECTION */}
              <Panel className="lg:col-span-2" glow="cyan">
                <PanelHeader
                  label="Health Score Trajectory"
                  title={`${timeframeLabels[selectedTimeframe]} Projection`}
                  right={<BarChart3 className="h-4 w-4 text-primary" />}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                  {projectionData.map((proj, i) => {
                    const scenarioType = proj.scenario_type as keyof typeof scenarioLabels;
                    const healthProjection = proj.health_score_projection;
                    const scoreDiff = healthProjection.predicted - healthProjection.current;
                    
                    return (
                      <div key={i} className="text-center">
                        <div className="mb-3">
                          <Badge 
                            variant="outline" 
                            className={`font-mono text-[10px] ${scenarioColors[scenarioType]}`}
                          >
                            {scenarioLabels[scenarioType]}
                          </Badge>
                        </div>
                        <ScoreRing
                          value={healthProjection.predicted}
                          label="Score"
                          size={100}
                          color={scoreDiff > 0 ? "success" : scoreDiff < 0 ? "warning" : "primary"}
                        />
                        <div className="mt-3 space-y-1">
                          <div className="text-xs text-muted-foreground">
                            Current: {healthProjection.current}
                          </div>
                          <div className={`text-sm font-mono ${
                            scoreDiff > 0 ? 'text-[var(--color-success)]' : 
                            scoreDiff < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(healthProjection.confidence * 100)}% confidence
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Projection Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generateProjectionChartData(projectionData, currentHealthScore)}>
                      <CartesianGrid stroke="oklch(0.4 0.08 250 / 18%)" />
                      <XAxis 
                        dataKey="period"
                        tick={{ fill: "oklch(0.7 0.04 240)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fill: "oklch(0.7 0.04 240)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{
                          background: "oklch(0.18 0.04 270)",
                          border: "1px solid oklch(0.4 0.08 250 / 50%)",
                          borderRadius: 10,
                        }}
                      />
                      <Legend />
                      {selectedScenarios.includes('best_case') && (
                        <Line
                          type="monotone"
                          dataKey="best_case"
                          stroke="var(--color-success)"
                          strokeWidth={2}
                          name="Best Case"
                        />
                      )}
                      {selectedScenarios.includes('realistic') && (
                        <Line
                          type="monotone"
                          dataKey="realistic"
                          stroke="oklch(0.86 0.18 200)"
                          strokeWidth={3}
                          name="Realistic"
                        />
                      )}
                      {selectedScenarios.includes('worst_case') && (
                        <Line
                          type="monotone"
                          dataKey="worst_case"
                          stroke="var(--color-destructive)"
                          strokeWidth={2}
                          name="Worst Case"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* INSIGHTS */}
              <Panel>
                <PanelHeader
                  label="Key Insights"
                  title="Projection Analysis"
                  right={<Gem className="h-4 w-4 text-accent" />}
                />
                
                <div className="space-y-4">
                  {projectionData.map((proj, i) => {
                    if (proj.scenario_type !== 'realistic') return null;
                    
                    return (
                      <div key={i} className="space-y-3">
                        {/* Risks */}
                        {proj.risks && proj.risks.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                              <span className="text-xs font-mono uppercase tracking-wider text-destructive">
                                Risk Factors
                              </span>
                            </div>
                            {proj.risks.slice(0, 2).map((risk: any, ri: number) => (
                              <div key={ri} className="text-xs p-2 rounded bg-destructive/10 border border-destructive/20">
                                <div className="font-semibold">{risk.risk}</div>
                                <div className="text-muted-foreground">
                                  {Math.round(risk.probability * 100)}% probability
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Opportunities */}
                        {proj.opportunities && proj.opportunities.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />
                              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-success)]">
                                Opportunities
                              </span>
                            </div>
                            {proj.opportunities.slice(0, 2).map((opp: any, oi: number) => (
                              <div key={oi} className="text-xs p-2 rounded bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
                                <div className="font-semibold">{opp.opportunity}</div>
                                <div className="text-muted-foreground">
                                  {Math.round(opp.potential * 100)}% potential
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          ) : (
            <Panel>
              <div className="text-center py-12 space-y-4">
                <Gem className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div className="space-y-2">
                  <div className="font-display text-lg text-muted-foreground">
                    No projections generated yet
                  </div>
                  <div className="text-sm text-muted-foreground max-w-md mx-auto">
                    Select your preferred timeframe and scenarios, then generate AI-powered predictions
                    of your health journey.
                  </div>
                </div>
                <Button 
                  onClick={handleGenerateProjection}
                  disabled={selectedScenarios.length === 0}
                  className="bg-accent hover:bg-accent/80"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Your First Projection
                </Button>
              </div>
            </Panel>
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {goals.data?.goals && goals.data.goals.length > 0 ? (
            <div className="grid gap-4">
              {goals.data.goals.map((goal) => (
                <Panel key={goal.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-accent" />
                        <Badge variant="outline" className="text-[10px] font-mono uppercase">
                          {goal.category}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-mono ${
                            goal.priority === 'high' ? 'text-destructive' :
                            goal.priority === 'medium' ? 'text-[var(--color-warning)]' :
                            'text-muted-foreground'
                          }`}
                        >
                          {goal.priority} priority
                        </Badge>
                      </div>
                      <h3 className="font-display font-semibold mb-1">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-mono">{goal.progress_percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2">
                          <div
                            className="bg-accent rounded-full h-2 transition-all"
                            style={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
                          />
                        </div>
                        
                        {goal.target_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Target: {new Date(goal.target_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <ScoreRing 
                        value={goal.progress_percentage} 
                        label="Progress" 
                        size={80}
                        color={goal.progress_percentage > 75 ? "success" : goal.progress_percentage > 50 ? "warning" : "primary"}
                      />
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          ) : (
            <Panel>
              <div className="text-center py-12 space-y-4">
                <Target className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div className="space-y-2">
                  <div className="font-display text-lg text-muted-foreground">
                    No active goals yet
                  </div>
                  <div className="text-sm text-muted-foreground max-w-md mx-auto">
                    Set health goals to see personalized achievement probabilities and timeline projections.
                  </div>
                </div>
                <Button variant="outline" className="border-accent/50 hover:border-accent text-accent">
                  <Target className="h-4 w-4 mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            </Panel>
          )}
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <Panel>
            <PanelHeader
              label="What-If Analysis"
              title="Explore different futures"
              right={<Gem className="h-4 w-4 text-accent" />}
            />
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                Advanced scenario modeling coming soon...
              </div>
              <Button variant="outline" disabled>
                <Zap className="h-4 w-4 mr-2" />
                Custom Scenario Builder
              </Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to generate chart data
function generateProjectionChartData(projections: any[], currentScore: number) {
  if (!projections.length) return [];

  const periods = ['Now', '25%', '50%', '75%', '100%'];
  
  return periods.map((period, index) => {
    const progress = index / (periods.length - 1);
    const data: any = { period };
    
    projections.forEach(proj => {
      const current = proj.health_score_projection.current;
      const predicted = proj.health_score_projection.predicted;
      const interpolated = current + (predicted - current) * progress;
      data[proj.scenario_type] = Math.round(interpolated);
    });
    
    return data;
  });
}