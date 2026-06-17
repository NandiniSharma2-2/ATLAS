// Future Projection Card Component
import { Panel, PanelHeader } from "./Panel";
import { ScoreRing } from "./ScoreRing";
import { Gem, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface FutureProjectionCardProps {
  projection?: {
    health_score_projection: {
      current: number;
      predicted: number;
      confidence: number;
    };
    goal_achievement_probability?: number;
    risks?: Array<{ risk: string; probability: number; impact: string }>;
    opportunities?: Array<{ opportunity: string; potential: number }>;
  };
  isLoading?: boolean;
  onGenerateProjection?: () => void;
}

export function FutureProjectionCard({ 
  projection, 
  isLoading, 
  onGenerateProjection 
}: FutureProjectionCardProps) {
  const [timeframe, setTimeframe] = useState<'30_day' | '6_month' | '1_year'>('30_day');

  if (isLoading) {
    return (
      <Panel>
        <PanelHeader
          label="Future-Me Simulator"
          title="Calculating trajectory..."
          right={<Gem className="h-4 w-4 text-accent animate-pulse" />}
        />
        <div className="flex justify-center py-8">
          <ScoreRing value={0} label="Analyzing..." size={120} className="animate-pulse" />
        </div>
      </Panel>
    );
  }

  if (!projection) {
    return (
      <Panel>
        <PanelHeader
          label="Future-Me Simulator"
          title="Predict your future health"
          right={<Gem className="h-4 w-4 text-accent" />}
        />
        <div className="text-center py-6 space-y-4">
          <div className="text-sm text-muted-foreground">
            Generate AI-powered projections of your health journey.
          </div>
          <Button 
            onClick={onGenerateProjection}
            variant="outline" 
            className="border-accent/50 hover:border-accent text-accent"
          >
            Generate 30-Day Projection
          </Button>
        </div>
      </Panel>
    );
  }

  const { health_score_projection } = projection;
  const scoreDiff = health_score_projection.predicted - health_score_projection.current;
  const TrendIcon = scoreDiff > 2 ? TrendingUp : scoreDiff < -2 ? TrendingDown : Minus;
  const trendColor = scoreDiff > 2 ? "text-[var(--color-success)]" : 
                     scoreDiff < -2 ? "text-destructive" : "text-muted-foreground";

  return (
    <Panel glow="cyan">
      <PanelHeader
        label="Future-Me Simulator"
        title="30-day projection"
        right={<Gem className="h-4 w-4 text-accent" />}
      />
      
      <div className="space-y-6">
        {/* Score Projection */}
        <div className="flex items-center justify-center">
          <ScoreRing 
            value={health_score_projection.predicted} 
            label="Projected" 
            size={120}
            color={scoreDiff > 0 ? "success" : scoreDiff < 0 ? "warning" : "primary"}
          />
        </div>

        {/* Projection Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border">
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className="text-sm font-mono">Current → Projected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{health_score_projection.current}</span>
              <span className="text-muted-foreground">→</span>
              <span className={`font-bold ${trendColor}`}>
                {health_score_projection.predicted}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border">
            <span className="text-sm font-mono">Confidence</span>
            <Badge variant="secondary" className="font-mono">
              {Math.round(health_score_projection.confidence * 100)}%
            </Badge>
          </div>

          {projection.goal_achievement_probability && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <span className="text-sm font-mono">Goal Success Rate</span>
              </div>
              <Badge 
                variant="secondary" 
                className={`font-mono ${
                  projection.goal_achievement_probability > 0.7 ? 'text-[var(--color-success)]' :
                  projection.goal_achievement_probability > 0.4 ? 'text-[var(--color-warning)]' :
                  'text-destructive'
                }`}
              >
                {Math.round(projection.goal_achievement_probability * 100)}%
              </Badge>
            </div>
          )}
        </div>

        {/* Risks and Opportunities */}
        {(projection.risks?.length || projection.opportunities?.length) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projection.risks && projection.risks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-destructive">
                  Key Risks
                </div>
                {projection.risks.slice(0, 2).map((risk, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-destructive/10 border border-destructive/20">
                    <div className="font-semibold">{risk.risk}</div>
                    <div className="text-muted-foreground">{Math.round(risk.probability * 100)}% chance</div>
                  </div>
                ))}
              </div>
            )}

            {projection.opportunities && projection.opportunities.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-success)]">
                  Opportunities
                </div>
                {projection.opportunities.slice(0, 2).map((opp, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
                    <div className="font-semibold">{opp.opportunity}</div>
                    <div className="text-muted-foreground">{Math.round(opp.potential * 100)}% potential</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}