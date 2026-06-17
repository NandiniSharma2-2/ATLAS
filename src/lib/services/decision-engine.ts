// Decision Intelligence Service
import type { DecisionSession, DecisionOption, DecisionAnalysis } from "@/integrations/supabase/extended-types";

export interface DecisionCriteria {
  id: string;
  name: string;
  weight: number;
  description?: string;
}

export interface DecisionAnalysisResult {
  ranked_options: Array<{
    option_id: string;
    title: string;
    total_score: number;
    weighted_score: number;
    rank: number;
    score_breakdown: Record<string, number>;
  }>;
  recommended_option: string;
  confidence_score: number;
  risk_score: number;
  opportunity_score: number;
  reasoning: {
    primary_factors: string[];
    decision_logic: string;
    trade_offs: string[];
    assumptions: string[];
  };
  key_factors: Array<{
    factor: string;
    influence: number;
    explanation: string;
  }>;
  warnings: string[];
  alternatives: Array<{
    option_id: string;
    reason: string;
    when_better: string;
  }>;
  sensitivity_analysis: {
    stable_ranking: boolean;
    critical_criteria: string[];
    ranking_changes: Array<{
      criteria: string;
      weight_change: number;
      new_ranking: string[];
    }>;
  };
}

export class DecisionEngine {
  /**
   * Analyze a decision with weighted scoring
   */
  static analyzeDecision(
    session: DecisionSession,
    options: DecisionOption[],
    criteria: DecisionCriteria[],
    optionScores: Record<string, Record<string, number>>
  ): DecisionAnalysisResult {
    
    if (options.length === 0) {
      throw new Error("No options to analyze");
    }

    if (criteria.length === 0) {
      throw new Error("No criteria defined");
    }

    // Normalize criteria weights
    const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    const normalizedCriteria = criteria.map(criterion => ({
      ...criterion,
      weight: criterion.weight / totalWeight
    }));

    // Calculate scores for each option
    const rankedOptions = options.map(option => {
      const scoreBreakdown: Record<string, number> = {};
      let weightedScore = 0;
      let totalScore = 0;

      normalizedCriteria.forEach(criterion => {
        const score = optionScores[option.id]?.[criterion.id] || 0;
        scoreBreakdown[criterion.name] = score;
        weightedScore += score * criterion.weight;
        totalScore += score;
      });

      return {
        option_id: option.id,
        title: option.title,
        total_score: totalScore,
        weighted_score: weightedScore,
        rank: 0, // Will be set after sorting
        score_breakdown: scoreBreakdown,
        option: option // Keep reference for analysis
      };
    }).sort((a, b) => b.weighted_score - a.weighted_score);

    // Assign ranks
    rankedOptions.forEach((option, index) => {
      option.rank = index + 1;
    });

    const topOption = rankedOptions[0];
    const recommendedOption = topOption.option_id;

    // Calculate confidence based on score separation and data quality
    const confidence = this.calculateConfidence(rankedOptions, normalizedCriteria, session);

    // Calculate risk and opportunity scores
    const riskScore = this.calculateRiskScore(rankedOptions);
    const opportunityScore = this.calculateOpportunityScore(rankedOptions);

    // Generate reasoning
    const reasoning = this.generateReasoning(rankedOptions, normalizedCriteria, session);

    // Identify key factors
    const keyFactors = this.identifyKeyFactors(rankedOptions, normalizedCriteria);

    // Generate warnings
    const warnings = this.generateWarnings(rankedOptions, session);

    // Generate alternatives
    const alternatives = this.generateAlternatives(rankedOptions);

    // Sensitivity analysis
    const sensitivityAnalysis = this.performSensitivityAnalysis(options, normalizedCriteria, optionScores);

    return {
      ranked_options: rankedOptions.map(({ option, ...rest }) => rest),
      recommended_option: recommendedOption,
      confidence_score: confidence,
      risk_score: riskScore,
      opportunity_score: opportunityScore,
      reasoning,
      key_factors: keyFactors,
      warnings,
      alternatives,
      sensitivity_analysis: sensitivityAnalysis
    };
  }

  /**
   * Generate contextual recommendations for decision criteria
   */
  static suggestCriteria(session: DecisionSession, options: DecisionOption[]): Array<{
    name: string;
    description: string;
    suggested_weight: number;
    category: 'financial' | 'time' | 'risk' | 'strategic' | 'personal';
  }> {
    const suggestions = [];

    // Analyze decision context for relevant criteria
    const hasFinancialData = options.some(opt => opt.estimated_cost > 0);
    const hasTimeData = options.some(opt => opt.estimated_time_days > 0);
    const hasEffortData = options.some(opt => opt.estimated_effort > 0);

    if (hasFinancialData) {
      suggestions.push({
        name: 'Cost Effectiveness',
        description: 'Total financial cost of this option',
        suggested_weight: 0.25,
        category: 'financial' as const
      });
    }

    if (hasTimeData) {
      suggestions.push({
        name: 'Time to Complete',
        description: 'How quickly this option can be implemented',
        suggested_weight: 0.2,
        category: 'time' as const
      });
    }

    if (hasEffortData) {
      suggestions.push({
        name: 'Implementation Effort',
        description: 'How much effort is required to execute this option',
        suggested_weight: 0.15,
        category: 'time' as const
      });
    }

    // Always suggest these core criteria
    suggestions.push(
      {
        name: 'Risk Level',
        description: 'Potential negative consequences or uncertainty',
        suggested_weight: 0.2,
        category: 'risk' as const
      },
      {
        name: 'Potential Reward',
        description: 'Expected positive outcomes and benefits',
        suggested_weight: 0.25,
        category: 'strategic' as const
      },
      {
        name: 'Alignment with Goals',
        description: 'How well this option supports your long-term objectives',
        suggested_weight: 0.15,
        category: 'strategic' as const
      }
    );

    // Consider importance level for additional criteria
    if (session.importance_level >= 4) {
      suggestions.push({
        name: 'Reversibility',
        description: 'How easy it is to change course after choosing this option',
        suggested_weight: 0.1,
        category: 'risk' as const
      });
    }

    return suggestions;
  }

  /**
   * Compare two specific options in detail
   */
  static compareOptions(
    option1: DecisionOption,
    option2: DecisionOption,
    criteria: DecisionCriteria[],
    scores: Record<string, Record<string, number>>
  ): {
    winner: string;
    comparison: Array<{
      criterion: string;
      option1_score: number;
      option2_score: number;
      winner: string;
      difference: number;
      weight: number;
    }>;
    summary: {
      option1_total: number;
      option2_total: number;
      key_differences: string[];
    };
  } {
    const comparison = criteria.map(criterion => {
      const score1 = scores[option1.id]?.[criterion.id] || 0;
      const score2 = scores[option2.id]?.[criterion.id] || 0;
      const difference = Math.abs(score1 - score2);
      
      return {
        criterion: criterion.name,
        option1_score: score1,
        option2_score: score2,
        winner: score1 > score2 ? option1.title : score2 > score1 ? option2.title : 'tie',
        difference,
        weight: criterion.weight
      };
    });

    const option1Total = comparison.reduce((sum, comp) => sum + comp.option1_score * comp.weight, 0);
    const option2Total = comparison.reduce((sum, comp) => sum + comp.option2_score * comp.weight, 0);
    
    const keyDifferences = comparison
      .filter(comp => comp.difference >= 2 && comp.weight > 0.1)
      .map(comp => `${comp.criterion}: ${comp.winner === option1.title ? option1.title : option2.title} scores ${comp.difference} points higher`)
      .slice(0, 3);

    return {
      winner: option1Total > option2Total ? option1.title : option2.title,
      comparison,
      summary: {
        option1_total: option1Total,
        option2_total: option2Total,
        key_differences: keyDifferences
      }
    };
  }

  // Private helper methods
  private static calculateConfidence(
    rankedOptions: any[],
    criteria: DecisionCriteria[],
    session: DecisionSession
  ): number {
    if (rankedOptions.length < 2) return 1.0;

    const topOption = rankedOptions[0];
    const secondOption = rankedOptions[1];
    
    // Score separation (larger gap = higher confidence)
    const scoreSeparation = (topOption.weighted_score - secondOption.weighted_score) / 10; // Normalize
    
    // Criteria coverage (more criteria = higher confidence)
    const criteriaCoverage = Math.min(1, criteria.length / 5);
    
    // Data completeness (how well scored the options are)
    const dataCompleteness = criteria.length > 0 ? 
      Object.values(topOption.score_breakdown).filter(score => score > 0).length / criteria.length : 0;
    
    // Importance factor (more important decisions get more scrutiny)
    const importanceFactor = session.importance_level / 5;
    
    const baseConfidence = (scoreSeparation + criteriaCoverage + dataCompleteness) / 3;
    
    return Math.max(0.1, Math.min(1.0, baseConfidence * importanceFactor));
  }

  private static calculateRiskScore(rankedOptions: any[]): number {
    const topOption = rankedOptions[0];
    const avgRisk = topOption.option.risk_level / 10; // Normalize to 0-1
    const reversibility = (10 - topOption.option.reversibility) / 10; // Lower reversibility = higher risk
    
    return Math.min(1.0, (avgRisk + reversibility) / 2);
  }

  private static calculateOpportunityScore(rankedOptions: any[]): number {
    const topOption = rankedOptions[0];
    const potentialReward = topOption.option.potential_reward / 10; // Normalize to 0-1
    const scoreDominance = rankedOptions.length > 1 ? 
      (topOption.weighted_score - rankedOptions[1].weighted_score) / topOption.weighted_score : 1;
    
    return Math.min(1.0, (potentialReward + scoreDominance) / 2);
  }

  private static generateReasoning(
    rankedOptions: any[],
    criteria: DecisionCriteria[],
    session: DecisionSession
  ): {
    primary_factors: string[];
    decision_logic: string;
    trade_offs: string[];
    assumptions: string[];
  } {
    const topOption = rankedOptions[0];
    
    // Find the criteria where top option scored highest
    const strongFactors = criteria
      .filter(criterion => topOption.score_breakdown[criterion.name] >= 8)
      .map(criterion => criterion.name)
      .slice(0, 3);

    const primaryFactors = strongFactors.length > 0 ? strongFactors : 
      criteria.sort((a, b) => b.weight - a.weight).slice(0, 3).map(c => c.name);

    const decisionLogic = `${topOption.title} was selected because it scores highest on the most important criteria: ${primaryFactors.join(', ')}. With a weighted score of ${topOption.weighted_score.toFixed(1)}, it outperforms other options by balancing ${criteria.length > 1 ? 'multiple factors' : 'the key criterion'} effectively.`;

    // Identify trade-offs (areas where top option is weak)
    const weakAreas = criteria
      .filter(criterion => topOption.score_breakdown[criterion.name] <= 5)
      .map(criterion => `Lower ${criterion.name.toLowerCase()}`)
      .slice(0, 2);

    const tradeOffs = weakAreas.length > 0 ? 
      [`Choosing ${topOption.title} means accepting: ${weakAreas.join(', ')}`] : 
      ['This option has no significant trade-offs based on the current criteria'];

    const assumptions = [
      'Criteria weights accurately reflect your priorities',
      'Option scores are based on reliable information',
      'External factors remain relatively stable'
    ];

    return {
      primary_factors: primaryFactors,
      decision_logic: decisionLogic,
      trade_offs: tradeOffs,
      assumptions
    };
  }

  private static identifyKeyFactors(
    rankedOptions: any[],
    criteria: DecisionCriteria[]
  ): Array<{ factor: string; influence: number; explanation: string }> {
    const topOption = rankedOptions[0];
    
    return criteria
      .map(criterion => {
        const score = topOption.score_breakdown[criterion.name];
        const influence = criterion.weight * (score / 10); // Normalize influence
        
        return {
          factor: criterion.name,
          influence,
          explanation: `Weighted impact: ${(influence * 100).toFixed(1)}% (score: ${score}, weight: ${(criterion.weight * 100).toFixed(0)}%)`
        };
      })
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 5);
  }

  private static generateWarnings(rankedOptions: any[], session: DecisionSession): string[] {
    const warnings = [];
    const topOption = rankedOptions[0];

    // High risk warning
    if (topOption.option.risk_level >= 8) {
      warnings.push(`High risk alert: ${topOption.title} has a risk level of ${topOption.option.risk_level}/10`);
    }

    // Low reversibility warning
    if (topOption.option.reversibility <= 3) {
      warnings.push(`Low reversibility: This decision will be difficult to change later`);
    }

    // Close competition warning
    if (rankedOptions.length > 1) {
      const scoreDiff = topOption.weighted_score - rankedOptions[1].weighted_score;
      if (scoreDiff < 1) {
        warnings.push(`Close competition: The top two options are very similar (${scoreDiff.toFixed(1)} point difference)`);
      }
    }

    // High cost warning
    if (topOption.option.estimated_cost > 1000) {
      warnings.push(`Significant financial commitment: Estimated cost is $${topOption.option.estimated_cost.toLocaleString()}`);
    }

    // Time pressure warning
    if (session.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(session.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline <= 7) {
        warnings.push(`Time pressure: Decision deadline is in ${daysUntilDeadline} days`);
      }
    }

    return warnings;
  }

  private static generateAlternatives(rankedOptions: any[]): Array<{
    option_id: string;
    reason: string;
    when_better: string;
  }> {
    if (rankedOptions.length < 2) return [];

    return rankedOptions.slice(1, 4).map((option, index) => ({
      option_id: option.option_id,
      reason: `Ranked #${index + 2} with score ${option.weighted_score.toFixed(1)}`,
      when_better: this.generateWhenBetterScenario(option, rankedOptions[0])
    }));
  }

  private static generateWhenBetterScenario(option: any, topOption: any): string {
    // Find where this option outperforms the top option
    const betterAreas = Object.entries(option.score_breakdown)
      .filter(([criterion, score]) => score > topOption.score_breakdown[criterion])
      .map(([criterion]) => criterion.toLowerCase())
      .slice(0, 2);

    if (betterAreas.length > 0) {
      return `Consider this option if ${betterAreas.join(' and ')} are more important than initially weighted`;
    }

    return 'Consider this option if circumstances change significantly';
  }

  private static performSensitivityAnalysis(
    options: DecisionOption[],
    criteria: DecisionCriteria[],
    optionScores: Record<string, Record<string, number>>
  ): {
    stable_ranking: boolean;
    critical_criteria: string[];
    ranking_changes: Array<{
      criteria: string;
      weight_change: number;
      new_ranking: string[];
    }>;
  } {
    const originalRanking = this.getRanking(options, criteria, optionScores);
    const rankingChanges = [];
    const criticalCriteria = [];

    // Test weight changes for each criterion
    for (const criterion of criteria) {
      // Test increasing weight by 50%
      const modifiedCriteria = criteria.map(c => 
        c.id === criterion.id ? { ...c, weight: c.weight * 1.5 } : c
      );
      
      const newRanking = this.getRanking(options, modifiedCriteria, optionScores);
      
      if (!this.arraysEqual(originalRanking, newRanking)) {
        rankingChanges.push({
          criteria: criterion.name,
          weight_change: 0.5,
          new_ranking: newRanking
        });
        criticalCriteria.push(criterion.name);
      }
    }

    const stableRanking = rankingChanges.length === 0;

    return {
      stable_ranking: stableRanking,
      critical_criteria: criticalCriteria,
      ranking_changes: rankingChanges.slice(0, 3) // Limit to top 3 changes
    };
  }

  private static getRanking(
    options: DecisionOption[],
    criteria: DecisionCriteria[],
    optionScores: Record<string, Record<string, number>>
  ): string[] {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    
    return options
      .map(option => {
        const weightedScore = criteria.reduce((sum, criterion) => {
          const score = optionScores[option.id]?.[criterion.id] || 0;
          return sum + (score * criterion.weight / totalWeight);
        }, 0);
        
        return { id: option.id, score: weightedScore };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.id);
  }

  private static arraysEqual(arr1: string[], arr2: string[]): boolean {
    return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
  }
}