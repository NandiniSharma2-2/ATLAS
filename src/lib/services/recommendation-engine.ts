// Explainable Recommendations Engine
import type { DailyLog } from "../atlas-scoring";
import type { 
  Recommendation, 
  RecommendationExplanation, 
  RecommendationSession,
  HealthCorrelation,
  UserGoal 
} from "@/integrations/supabase/extended-types";
import { HealthAnalyzer } from "./health-analyzer";

export interface RecommendationContext {
  user_data: DailyLog[];
  goals: UserGoal[];
  correlations: HealthCorrelation[];
  recent_trends: any[];
  user_patterns: any[];
}

export interface ExplainableRecommendation {
  recommendation: Omit<Recommendation, 'id' | 'session_id' | 'user_id' | 'created_at'>;
  explanation: Omit<RecommendationExplanation, 'id' | 'recommendation_id' | 'created_at'>;
  alternatives: Array<{
    title: string;
    description: string;
    when_better: string;
    confidence_score: number;
  }>;
  confidence_factors: Array<{
    factor: string;
    contribution: number;
    description: string;
  }>;
}

export class RecommendationEngine {
  /**
   * Generate comprehensive recommendations based on user data
   */
  static generateRecommendations(
    context: RecommendationContext,
    categories: string[] = ['sleep', 'exercise', 'nutrition', 'hydration', 'stress', 'habits']
  ): {
    session: Omit<RecommendationSession, 'id' | 'user_id' | 'created_at'>;
    recommendations: ExplainableRecommendation[];
    overall_insights: {
      primary_focus_areas: string[];
      improvement_potential: number;
      risk_factors: string[];
      success_likelihood: number;
    };
  } {
    // Analyze current state
    const analysis = this.analyzeCurrentState(context);
    
    // Generate category-specific recommendations
    const recommendations: ExplainableRecommendation[] = [];
    
    categories.forEach(category => {
      const categoryRecs = this.generateCategoryRecommendations(category, context, analysis);
      recommendations.push(...categoryRecs);
    });

    // Prioritize and limit recommendations (top 5-7)
    const prioritizedRecommendations = this.prioritizeRecommendations(recommendations, analysis);
    
    // Generate overall insights
    const overallInsights = this.generateOverallInsights(context, analysis, prioritizedRecommendations);
    
    // Create recommendation session
    const session: Omit<RecommendationSession, 'id' | 'user_id' | 'created_at'> = {
      session_name: `Health Analysis - ${new Date().toLocaleDateString()}`,
      trigger_context: 'comprehensive_analysis',
      requested_categories: categories,
      analysis_date_range: {
        start_date: context.user_data[context.user_data.length - 1]?.log_date || '',
        end_date: context.user_data[0]?.log_date || ''
      },
      user_data_analyzed: {
        logs_count: context.user_data.length,
        goals_count: context.goals.length,
        correlations_found: context.correlations.length,
        analysis_quality: this.calculateAnalysisQuality(context)
      },
      analysis_confidence: this.calculateOverallConfidence(prioritizedRecommendations)
    };

    return {
      session,
      recommendations: prioritizedRecommendations,
      overall_insights: overallInsights
    };
  }

  /**
   * Generate goal-specific recommendations
   */
  static generateGoalRecommendations(
    goal: UserGoal,
    context: RecommendationContext
  ): ExplainableRecommendation[] {
    const recommendations: ExplainableRecommendation[] = [];
    
    // Analyze goal progress
    const goalAnalysis = this.analyzeGoalProgress(goal, context);
    
    // Generate specific recommendations based on goal category and current progress
    switch (goal.category.toLowerCase()) {
      case 'weight':
        recommendations.push(...this.generateWeightGoalRecommendations(goal, goalAnalysis, context));
        break;
      case 'fitness':
        recommendations.push(...this.generateFitnessGoalRecommendations(goal, goalAnalysis, context));
        break;
      case 'sleep':
        recommendations.push(...this.generateSleepGoalRecommendations(goal, goalAnalysis, context));
        break;
      case 'health':
        recommendations.push(...this.generateHealthGoalRecommendations(goal, goalAnalysis, context));
        break;
      default:
        recommendations.push(...this.generateGenericGoalRecommendations(goal, goalAnalysis, context));
    }

    return recommendations;
  }

  /**
   * Generate recommendations for specific health issues/patterns
   */
  static generatePatternBasedRecommendations(
    pattern: {
      type: 'declining_trend' | 'poor_correlation' | 'inconsistent_behavior' | 'risk_factor';
      metrics_involved: string[];
      severity: 'low' | 'medium' | 'high';
      timeframe_days: number;
    },
    context: RecommendationContext
  ): ExplainableRecommendation[] {
    const recommendations: ExplainableRecommendation[] = [];

    switch (pattern.type) {
      case 'declining_trend':
        recommendations.push(...this.generateTrendReversalRecommendations(pattern, context));
        break;
      case 'poor_correlation':
        recommendations.push(...this.generateCorrelationImprovementRecommendations(pattern, context));
        break;
      case 'inconsistent_behavior':
        recommendations.push(...this.generateConsistencyRecommendations(pattern, context));
        break;
      case 'risk_factor':
        recommendations.push(...this.generateRiskMitigationRecommendations(pattern, context));
        break;
    }

    return recommendations;
  }

  /**
   * Generate emergency/urgent recommendations for health risks
   */
  static generateUrgentRecommendations(
    context: RecommendationContext
  ): ExplainableRecommendation[] {
    const urgentRecommendations: ExplainableRecommendation[] = [];
    
    // Check for critical health patterns
    const criticalIssues = this.identifyCriticalHealthIssues(context);
    
    criticalIssues.forEach(issue => {
      const urgentRec = this.createUrgentRecommendation(issue, context);
      if (urgentRec) {
        urgentRecommendations.push(urgentRec);
      }
    });

    return urgentRecommendations;
  }

  // Private helper methods
  private static analyzeCurrentState(context: RecommendationContext): {
    health_scores: Record<string, number>;
    trends: Record<string, { direction: string; strength: number; confidence: number }>;
    weak_areas: string[];
    strong_areas: string[];
    opportunities: string[];
    risks: string[];
  } {
    const recentLogs = context.user_data.slice(0, 30);
    
    // Calculate current health scores for each category
    const healthScores: Record<string, number> = {};
    const metrics = ['sleep_hours', 'steps', 'hydration_ml', 'mood', 'recovery_score', 'nutrition_score'];
    
    metrics.forEach(metric => {
      const values = recentLogs
        .map(log => log[metric as keyof DailyLog])
        .filter(val => val !== null) as number[];
      
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        healthScores[metric] = this.normalizeMetricScore(metric, average);
      }
    });

    // Analyze trends
    const trends = HealthAnalyzer.analyzeHealthTrends(context.user_data, 30);
    const trendMap: Record<string, any> = {};
    
    trends.trends.forEach(trend => {
      trendMap[trend.metric] = {
        direction: trend.direction,
        strength: Math.abs(trend.change_percentage),
        confidence: trend.confidence
      };
    });

    // Identify weak and strong areas
    const weakAreas = Object.entries(healthScores)
      .filter(([_, score]) => score < 60)
      .map(([metric, _]) => metric)
      .sort((a, b) => healthScores[a] - healthScores[b]);

    const strongAreas = Object.entries(healthScores)
      .filter(([_, score]) => score >= 80)
      .map(([metric, _]) => metric)
      .sort((a, b) => healthScores[b] - healthScores[a]);

    // Identify opportunities and risks
    const opportunities = this.identifyOpportunities(healthScores, trendMap, context);
    const risks = this.identifyRisks(healthScores, trendMap, context);

    return {
      health_scores: healthScores,
      trends: trendMap,
      weak_areas: weakAreas,
      strong_areas: strongAreas,
      opportunities,
      risks
    };
  }

  private static generateCategoryRecommendations(
    category: string, 
    context: RecommendationContext, 
    analysis: any
  ): ExplainableRecommendation[] {
    const recommendations: ExplainableRecommendation[] = [];

    switch (category) {
      case 'sleep':
        recommendations.push(...this.generateSleepRecommendations(context, analysis));
        break;
      case 'exercise':
        recommendations.push(...this.generateExerciseRecommendations(context, analysis));
        break;
      case 'nutrition':
        recommendations.push(...this.generateNutritionRecommendations(context, analysis));
        break;
      case 'hydration':
        recommendations.push(...this.generateHydrationRecommendations(context, analysis));
        break;
      case 'stress':
        recommendations.push(...this.generateStressRecommendations(context, analysis));
        break;
      case 'habits':
        recommendations.push(...this.generateHabitRecommendations(context, analysis));
        break;
    }

    return recommendations;
  }

  private static generateSleepRecommendations(
    context: RecommendationContext, 
    analysis: any
  ): ExplainableRecommendation[] {
    const recommendations: ExplainableRecommendation[] = [];
    const sleepData = context.user_data.map(log => log.sleep_hours).filter(h => h !== null) as number[];
    
    if (sleepData.length < 7) return recommendations;

    const avgSleep = sleepData.reduce((sum, h) => sum + h, 0) / sleepData.length;
    const sleepConsistency = this.calculateConsistency(sleepData);

    // Low sleep duration recommendation
    if (avgSleep < 7) {
      const targetSleep = Math.min(8.5, avgSleep + 1);
      recommendations.push({
        recommendation: {
          title: 'Increase Sleep Duration',
          description: `Aim for ${targetSleep.toFixed(1)} hours of sleep per night`,
          category: 'sleep',
          recommendation_type: 'increase',
          specific_action: `Establish a bedtime that allows for ${targetSleep.toFixed(1)} hours of sleep before your wake time`,
          target_value: targetSleep,
          target_unit: 'hours',
          frequency: 'daily',
          confidence_score: 0.9,
          expected_impact_score: 0.8,
          effort_required: 3,
          time_to_see_results_days: 14,
          priority_level: 5,
          urgency_level: 4
        },
        explanation: {
          primary_reason: `Your average sleep duration of ${avgSleep.toFixed(1)} hours is below the recommended 7-9 hours`,
          supporting_reasons: [
            'Sleep debt accumulates and affects cognitive performance',
            'Insufficient sleep impacts mood and energy levels',
            'Recovery and immune function depend on adequate sleep'
          ],
          data_patterns_used: [
            `Average sleep: ${avgSleep.toFixed(1)} hours over ${sleepData.length} days`,
            `Sleep consistency: ${(sleepConsistency * 100).toFixed(0)}%`
          ],
          correlations_found: this.findSleepCorrelations(context),
          trend_direction: analysis.trends.sleep_hours?.direction || 'stable',
          trend_confidence: analysis.trends.sleep_hours?.confidence || 0.5,
          trend_timeframe_days: 30,
          risks_if_ignored: [
            'Continued cognitive decline',
            'Increased stress and mood instability',
            'Higher risk of illness and slower recovery'
          ],
          risk_probability: 0.8,
          potential_benefits: [
            'Improved energy and alertness',
            'Better mood regulation',
            'Enhanced immune function',
            'Improved physical recovery'
          ]
        },
        alternatives: [
          {
            title: 'Improve Sleep Quality Instead',
            description: 'Focus on sleep quality rather than duration',
            when_better: 'If you have strict time constraints but can control sleep environment',
            confidence_score: 0.7
          },
          {
            title: 'Gradual Sleep Extension',
            description: 'Increase sleep by 15 minutes every 3 days',
            when_better: 'If sudden schedule changes are difficult',
            confidence_score: 0.8
          }
        ],
        confidence_factors: [
          {
            factor: 'Data Quality',
            contribution: 0.3,
            description: `${sleepData.length} days of sleep data available`
          },
          {
            factor: 'Sleep Deficit',
            contribution: 0.4,
            description: `${(7 - avgSleep).toFixed(1)} hour deficit from minimum recommendation`
          },
          {
            factor: 'Research Evidence',
            contribution: 0.3,
            description: 'Strong scientific consensus on sleep duration importance'
          }
        ]
      });
    }

    // Sleep consistency recommendation
    if (sleepConsistency < 0.8) {
      recommendations.push({
        recommendation: {
          title: 'Improve Sleep Consistency',
          description: 'Maintain consistent bedtime and wake time, even on weekends',
          category: 'sleep',
          recommendation_type: 'adjust',
          specific_action: 'Go to bed and wake up within 30 minutes of the same times daily',
          frequency: 'daily',
          confidence_score: 0.85,
          expected_impact_score: 0.7,
          effort_required: 4,
          time_to_see_results_days: 10,
          priority_level: 4,
          urgency_level: 3
        },
        explanation: {
          primary_reason: `Your sleep timing varies significantly (consistency: ${(sleepConsistency * 100).toFixed(0)}%)`,
          supporting_reasons: [
            'Irregular sleep disrupts circadian rhythms',
            'Consistent timing improves sleep quality',
            'Better sleep consistency leads to improved daytime alertness'
          ],
          data_patterns_used: [
            `Sleep consistency score: ${(sleepConsistency * 100).toFixed(0)}%`,
            'Irregular bedtimes detected in recent data'
          ],
          trend_direction: 'variable',
          potential_benefits: [
            'More refreshing sleep',
            'Easier time falling asleep',
            'Improved morning alertness',
            'Better weekend recovery'
          ]
        },
        alternatives: [
          {
            title: 'Weekend Sleep-In Limit',
            description: 'Allow sleeping in but limit to 1 extra hour on weekends',
            when_better: 'If complete consistency is too restrictive',
            confidence_score: 0.6
          }
        ],
        confidence_factors: [
          {
            factor: 'Sleep Variability',
            contribution: 0.5,
            description: 'High variation in sleep times detected'
          },
          {
            factor: 'Circadian Science',
            contribution: 0.5,
            description: 'Strong evidence for consistency benefits'
          }
        ]
      });
    }

    return recommendations;
  }

  private static generateExerciseRecommendations(
    context: RecommendationContext, 
    analysis: any
  ): ExplainableRecommendation[] {
    const recommendations: ExplainableRecommendation[] = [];
    const stepsData = context.user_data.map(log => log.steps).filter(s => s !== null) as number[];
    
    if (stepsData.length < 7) return recommendations;

    const avgSteps = stepsData.reduce((sum, s) => sum + s, 0) / stepsData.length;
    const exerciseMinutes = context.user_data.map(log => (log as any).exercise_minutes || 0);
    const avgExercise = exerciseMinutes.reduce((sum: number, m: number) => sum + m, 0) / exerciseMinutes.length;

    // Low activity recommendation
    if (avgSteps < 8000) {
      const targetSteps = Math.min(10000, avgSteps + 2000);
      recommendations.push({
        recommendation: {
          title: 'Increase Daily Activity',
          description: `Aim for ${targetSteps.toLocaleString()} steps per day`,
          category: 'exercise',
          recommendation_type: 'increase',
          specific_action: `Add ${(targetSteps - avgSteps).toLocaleString()} more steps to your daily routine through walking, stairs, or active hobbies`,
          target_value: targetSteps,
          target_unit: 'steps',
          frequency: 'daily',
          confidence_score: 0.85,
          expected_impact_score: 0.75,
          effort_required: 3,
          time_to_see_results_days: 7,
          priority_level: 4,
          urgency_level: 3
        },
        explanation: {
          primary_reason: `Your average of ${avgSteps.toLocaleString()} steps is below the recommended 8,000-10,000 daily steps`,
          supporting_reasons: [
            'Regular activity improves cardiovascular health',
            'Movement enhances mood and energy levels',
            'Daily activity supports weight management'
          ],
          data_patterns_used: [
            `Average daily steps: ${avgSteps.toLocaleString()}`,
            `Activity trend: ${analysis.trends.steps?.direction || 'stable'}`
          ],
          correlations_found: this.findActivityCorrelations(context),
          potential_benefits: [
            'Improved cardiovascular fitness',
            'Better mood and energy',
            'Enhanced sleep quality',
            'Stronger bones and muscles'
          ]
        },
        alternatives: [
          {
            title: 'Structured Exercise Sessions',
            description: '30 minutes of focused exercise 3-4 times per week',
            when_better: 'If you prefer scheduled workouts over constant activity',
            confidence_score: 0.8
          }
        ],
        confidence_factors: [
          {
            factor: 'Activity Gap',
            contribution: 0.4,
            description: `${8000 - avgSteps} steps below minimum recommendation`
          },
          {
            factor: 'Health Benefits',
            contribution: 0.6,
            description: 'Strong evidence for activity health benefits'
          }
        ]
      });
    }

    return recommendations;
  }

  // Additional category-specific recommendation methods would be implemented...
  private static generateNutritionRecommendations(context: RecommendationContext, analysis: any): ExplainableRecommendation[] {
    return [];
  }

  private static generateHydrationRecommendations(context: RecommendationContext, analysis: any): ExplainableRecommendation[] {
    return [];
  }

  private static generateStressRecommendations(context: RecommendationContext, analysis: any): ExplainableRecommendation[] {
    return [];
  }

  private static generateHabitRecommendations(context: RecommendationContext, analysis: any): ExplainableRecommendation[] {
    return [];
  }

  // Helper methods
  private static normalizeMetricScore(metric: string, value: number): number {
    // Normalize different metrics to 0-100 scale
    switch (metric) {
      case 'sleep_hours':
        return Math.min(100, Math.max(0, (value / 8) * 100));
      case 'steps':
        return Math.min(100, Math.max(0, (value / 10000) * 100));
      case 'hydration_ml':
        return Math.min(100, Math.max(0, (value / 2500) * 100));
      case 'mood':
        return Math.min(100, Math.max(0, (value / 10) * 100));
      case 'recovery_score':
      case 'nutrition_score':
        return Math.min(100, Math.max(0, value));
      default:
        return value;
    }
  }

  private static calculateConsistency(values: number[]): number {
    if (values.length < 2) return 1;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation
    
    return Math.max(0, 1 - cv);
  }

  private static findSleepCorrelations(context: RecommendationContext): any[] {
    return context.correlations
      .filter(corr => corr.factor_a === 'sleep_hours' || corr.factor_b === 'sleep_hours')
      .map(corr => ({
        metric: corr.factor_a === 'sleep_hours' ? corr.factor_b : corr.factor_a,
        strength: corr.correlation_strength,
        description: `Sleep correlates with ${corr.factor_a === 'sleep_hours' ? corr.factor_b : corr.factor_a}`
      }));
  }

  private static findActivityCorrelations(context: RecommendationContext): any[] {
    return context.correlations
      .filter(corr => corr.factor_a === 'steps' || corr.factor_b === 'steps')
      .map(corr => ({
        metric: corr.factor_a === 'steps' ? corr.factor_b : corr.factor_a,
        strength: corr.correlation_strength,
        description: `Activity correlates with ${corr.factor_a === 'steps' ? corr.factor_b : corr.factor_a}`
      }));
  }

  private static identifyOpportunities(healthScores: Record<string, number>, trends: any, context: RecommendationContext): string[] {
    const opportunities = [];
    
    // Look for metrics that are improving
    Object.entries(trends).forEach(([metric, trend]) => {
      if ((trend as any).direction === 'improving') {
        opportunities.push(`Continue ${metric} improvement momentum`);
      }
    });

    // Look for strong correlations that can be leveraged
    context.correlations.forEach(corr => {
      if (Math.abs(corr.correlation_strength) > 0.6) {
        opportunities.push(`Leverage ${corr.factor_a}-${corr.factor_b} connection`);
      }
    });

    return opportunities.slice(0, 3);
  }

  private static identifyRisks(healthScores: Record<string, number>, trends: any, context: RecommendationContext): string[] {
    const risks = [];
    
    // Look for declining metrics
    Object.entries(trends).forEach(([metric, trend]) => {
      if ((trend as any).direction === 'declining') {
        risks.push(`${metric} declining trend`);
      }
    });

    // Look for very low scores
    Object.entries(healthScores).forEach(([metric, score]) => {
      if (score < 40) {
        risks.push(`Critical ${metric} level`);
      }
    });

    return risks.slice(0, 3);
  }

  private static prioritizeRecommendations(
    recommendations: ExplainableRecommendation[], 
    analysis: any
  ): ExplainableRecommendation[] {
    return recommendations
      .sort((a, b) => {
        // Sort by priority level (higher first), then by expected impact
        if (a.recommendation.priority_level !== b.recommendation.priority_level) {
          return b.recommendation.priority_level - a.recommendation.priority_level;
        }
        return b.recommendation.expected_impact_score - a.recommendation.expected_impact_score;
      })
      .slice(0, 7); // Limit to top 7 recommendations
  }

  private static generateOverallInsights(
    context: RecommendationContext, 
    analysis: any, 
    recommendations: ExplainableRecommendation[]
  ): any {
    const primaryFocusAreas = recommendations.slice(0, 3).map(rec => rec.recommendation.category);
    const improvementPotential = this.calculateImprovementPotential(analysis, recommendations);
    const riskFactors = analysis.risks.slice(0, 3);
    const successLikelihood = this.calculateSuccessLikelihood(recommendations, context);

    return {
      primary_focus_areas: [...new Set(primaryFocusAreas)],
      improvement_potential: improvementPotential,
      risk_factors: riskFactors,
      success_likelihood: successLikelihood
    };
  }

  private static calculateAnalysisQuality(context: RecommendationContext): number {
    const dataPoints = context.user_data.length;
    const goalsCoverage = Math.min(1, context.goals.length / 3);
    const correlationsFound = Math.min(1, context.correlations.length / 5);
    
    const dataQuality = Math.min(1, dataPoints / 30);
    
    return (dataQuality + goalsCoverage + correlationsFound) / 3;
  }

  private static calculateOverallConfidence(recommendations: ExplainableRecommendation[]): number {
    if (recommendations.length === 0) return 0;
    
    const totalConfidence = recommendations.reduce((sum, rec) => sum + rec.recommendation.confidence_score, 0);
    return totalConfidence / recommendations.length;
  }

  private static calculateImprovementPotential(analysis: any, recommendations: ExplainableRecommendation[]): number {
    const avgImpact = recommendations.reduce((sum, rec) => sum + rec.recommendation.expected_impact_score, 0) / recommendations.length;
    const weakAreasCount = analysis.weak_areas.length;
    const opportunitiesCount = analysis.opportunities.length;
    
    return Math.min(1, (avgImpact + (opportunitiesCount * 0.1) + (weakAreasCount * 0.05)));
  }

  private static calculateSuccessLikelihood(recommendations: ExplainableRecommendation[], context: RecommendationContext): number {
    const avgEffort = recommendations.reduce((sum, rec) => sum + rec.recommendation.effort_required, 0) / recommendations.length;
    const effortFactor = Math.max(0, 1 - (avgEffort / 10)); // Lower effort = higher success
    
    const dataQuality = Math.min(1, context.user_data.length / 30);
    
    return (effortFactor + dataQuality) / 2;
  }

  // Additional methods for other recommendation types would be implemented...
  private static analyzeGoalProgress(goal: UserGoal, context: RecommendationContext): any {
    return {};
  }

  private static generateWeightGoalRecommendations(goal: UserGoal, analysis: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateFitnessGoalRecommendations(goal: UserGoal, analysis: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateSleepGoalRecommendations(goal: UserGoal, analysis: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateHealthGoalRecommendations(goal: UserGoal, analysis: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateGenericGoalRecommendations(goal: UserGoal, analysis: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateTrendReversalRecommendations(pattern: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateCorrelationImprovementRecommendations(pattern: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateConsistencyRecommendations(pattern: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static generateRiskMitigationRecommendations(pattern: any, context: RecommendationContext): ExplainableRecommendation[] {
    return [];
  }

  private static identifyCriticalHealthIssues(context: RecommendationContext): any[] {
    return [];
  }

  private static createUrgentRecommendation(issue: any, context: RecommendationContext): ExplainableRecommendation | null {
    return null;
  }
}