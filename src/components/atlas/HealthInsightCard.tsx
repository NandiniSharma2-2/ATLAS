// Health Insight Card Component
import { Panel, PanelHeader } from "./Panel";
import { Brain, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HealthInsight } from "@/integrations/supabase/extended-types";

interface HealthInsightCardProps {
  insights: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
  }>;
  isLoading?: boolean;
}

const insightIcons = {
  trend: TrendingUp,
  pattern: Activity,
  correlation: Lightbulb,
  anomaly: AlertCircle,
} as const;

const insightColors = {
  trend: "text-[var(--color-success)]",
  pattern: "text-primary", 
  correlation: "text-accent",
  anomaly: "text-[var(--color-warning)]",
} as const;

export function HealthInsightCard({ insights, isLoading }: HealthInsightCardProps) {
  if (isLoading) {
    return (
      <Panel>
        <PanelHeader
          label="Health Intelligence"
          title="Analyzing patterns..."
          right={<Brain className="h-4 w-4 text-primary animate-pulse" />}
        />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-border/50 rounded mb-2" />
              <div className="h-3 bg-border/30 rounded w-3/4" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Panel>
        <PanelHeader
          label="Health Intelligence"
          title="Building your profile..."
          right={<Brain className="h-4 w-4 text-muted-foreground" />}
        />
        <div className="text-sm text-muted-foreground text-center py-6">
          Keep logging your health data to unlock personalized insights.
        </div>
      </Panel>
    );
  }

  return (
    <Panel glow="violet">
      <PanelHeader
        label="Health Intelligence"
        title="Key insights discovered"
        right={<Brain className="h-4 w-4 text-primary" />}
      />
      <div className="space-y-3">
        {insights.slice(0, 3).map((insight, i) => {
          const IconComponent = insightIcons[insight.type as keyof typeof insightIcons] || Lightbulb;
          const iconColor = insightColors[insight.type as keyof typeof insightColors] || "text-primary";
          
          return (
            <div
              key={i}
              className="relative p-4 rounded-lg bg-background/40 border border-border hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${iconColor}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider">
                      {insight.type}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="font-display font-semibold text-sm mb-1">
                    {insight.title}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {insight.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}