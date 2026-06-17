// Recommendation Card Component  
import { Panel, PanelHeader } from "./Panel";
import { Lightbulb, CheckCircle, XCircle, Clock, Star, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface RecommendationCardProps {
  recommendations?: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    specific_action: string;
    confidence_score: number;
    expected_impact_score: number;
    effort_required: number;
    priority_level: number;
    explanation?: {
      primary_reason: string;
      supporting_reasons: string[];
      potential_benefits: string[];
    };
  }>;
  isLoading?: boolean;
  onGenerateRecommendations?: () => void;
  onAcceptRecommendation?: (id: string) => void;
  onRejectRecommendation?: (id: string) => void;
}

const categoryColors = {
  sleep: "text-accent",
  exercise: "text-[var(--color-success)]",
  nutrition: "text-[var(--color-warning)]",
  hydration: "text-primary",
  stress: "text-destructive",
  habits: "text-violet-400",
} as const;

export function RecommendationCard({ 
  recommendations, 
  isLoading, 
  onGenerateRecommendations,
  onAcceptRecommendation,
  onRejectRecommendation 
}: RecommendationCardProps) {
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Panel>
        <PanelHeader
          label="AI Recommendations"
          title="Analyzing your data..."
          right={<Lightbulb className="h-4 w-4 text-accent animate-pulse" />}
        />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse p-4 rounded-lg bg-background/40 border border-border">
              <div className="h-4 bg-border/50 rounded mb-2" />
              <div className="h-3 bg-border/30 rounded w-2/3" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Panel>
        <PanelHeader
          label="AI Recommendations"
          title="Personalized health insights"
          right={<Lightbulb className="h-4 w-4 text-accent" />}
        />
        <div className="text-center py-6 space-y-4">
          <div className="text-sm text-muted-foreground">
            Get AI-powered recommendations based on your health patterns.
          </div>
          <Button 
            onClick={onGenerateRecommendations}
            variant="outline" 
            className="border-accent/50 hover:border-accent text-accent"
          >
            Generate Recommendations
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel glow="orange">
      <PanelHeader
        label="AI Recommendations"
        title={`${recommendations.length} personalized insights`}
        right={<Lightbulb className="h-4 w-4 text-accent" />}
      />
      
      <div className="space-y-3">
        {recommendations.slice(0, 4).map((rec) => {
          const categoryColor = categoryColors[rec.category as keyof typeof categoryColors] || "text-primary";
          const isExpanded = expandedRec === rec.id;
          
          return (
            <Collapsible key={rec.id}>
              <div className="p-4 rounded-lg bg-background/40 border border-border hover:border-accent/50 transition-colors group">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] font-mono uppercase tracking-wider ${categoryColor}`}
                        >
                          {rec.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {[...Array(rec.priority_level)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current text-[var(--color-warning)]" />
                          ))}
                        </div>
                      </div>
                      <div className="font-display font-semibold mb-1">
                        {rec.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {rec.specific_action}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="font-display text-xl font-bold text-accent">
                        {Math.round(rec.expected_impact_score * 100)}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        impact %
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Confidence:</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {Math.round(rec.confidence_score * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Effort:</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {rec.effort_required}/10
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
                        className="text-xs h-8 px-3"
                      >
                        <Info className="h-3 w-3 mr-1" />
                        {isExpanded ? 'Hide' : 'Why?'}
                      </Button>
                    </CollapsibleTrigger>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRejectRecommendation?.(rec.id)}
                        className="text-xs h-8 px-3 hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Pass
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAcceptRecommendation?.(rec.id)}
                        className="text-xs h-8 px-3 border-[var(--color-success)]/50 hover:border-[var(--color-success)] text-[var(--color-success)]"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Try it
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Explanation */}
                <CollapsibleContent className="mt-3 pt-3 border-t border-border">
                  {rec.explanation && (
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Why this recommendation?
                        </div>
                        <div className="text-foreground">{rec.explanation.primary_reason}</div>
                      </div>
                      
                      {rec.explanation.supporting_reasons?.length > 0 && (
                        <div>
                          <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Supporting evidence
                          </div>
                          <ul className="space-y-1">
                            {rec.explanation.supporting_reasons.map((reason, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <div className="h-1 w-1 rounded-full bg-accent mt-2 shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.explanation.potential_benefits?.length > 0 && (
                        <div>
                          <div className="font-semibold text-[var(--color-success)] uppercase tracking-wider mb-1">
                            Expected benefits
                          </div>
                          <ul className="space-y-1">
                            {rec.explanation.potential_benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-[var(--color-success)] mt-0.5 shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
      
      {recommendations.length > 4 && (
        <div className="mt-4 text-center">
          <Button variant="ghost" className="text-xs text-muted-foreground">
            View all {recommendations.length} recommendations
          </Button>
        </div>
      )}
    </Panel>
  );
}