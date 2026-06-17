// Future-Me Simulator & Prediction Engine
import type { DailyLog } from "../atlas-scoring";
import type { UserGoal, FutureProjection } from "@/integrations/supabase/extended-types";
import { unifiedHealthScore } from "../atlas-scoring";

export class PredictionEngine {
  /**
   * Generate 30-day projection based on current trends
   */
  static generate30DayProjection(logs: DailyLog[], goals: UserGoal[] = []): {
    best_case: FutureProjection;
    realistic: FutureProjection;
    worst_case: FutureProjection;
  } {
    const baseAnalysis = this.analyzeCurrentState(logs);
    const trends = this.calculateTrends(logs);
    
    return {
      best_case: this.generateScenario(logs, goals, '30_day', 'best_case', baseAnalysis, trends),
      realistic: this.generateScenario(logs, goals, '30_day', 'realistic', baseAnalysis, trends),
      worst_case: this.generateScenario(logs, goals, '30_day', 'worst_case', baseAnalysis, trends)
    };
  }

  /**
   * Generate 6-month projection with behavioral changes
   */
  static generate6MonthProjection(logs: DailyLog[], goals: UserGoal[] = []): {
    best_case: FutureProjection;
    realistic: FutureProjection;
    worst_case: FutureProjection;
  } {
    const baseAnalysis = this.analyzeCurrentState(logs);
    const trends = this.calculateTrends(logs);
    
    return {
      best_case: this.generateScenario(logs, goals, '6_month', 'best_case', baseAnalysis, trends),
      realistic: this.generateScenario(logs, goals, '6_month', 'realistic', baseAnalysis, trends),
      worst_case: this.generateScenario(logs, goals, '6_month', 'worst_case', baseAnalysis, trends)
    };
  }

  /**
   * Generate 1-year projection with major life changes
   */
  static generate1YearProjection(logs: DailyLog[], goals: UserGoal[] = []): {
    best_case: FutureProjection;
    realistic: FutureProjection;
    worst_case: FutureProjection;
  } {
    const baseAnalysis = this.analyzeCurrentState(logs);
    const trends = this.calculateTrends(logs);
    
    return {
      best_case: this.generateScenario(logs, goals, '1_year', 'best_case', baseAnalysis, trends),
      realistic: this.generateScenario(logs, goals, '1_year', 'realistic', baseAnalysis, trends),
      worst_case: this.generateScenario(logs, goals, '1_year', 'worst_case', baseAnalysis, trends)
    };
  }

  /**
   * Calculate goal achievement probability
   */
  static calculateGoalAchievementProbability(goal: UserGoal, logs: DailyLog[]): {
    probability: number;
    confidence: number;
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    timeline_assessment: {
      on_track: boolean;
      estimated_completion: string;
      required_rate: number;
      current_rate: number;
    };
  } {
    const currentValue = goal.current_value || 0;
    const targetValue = goal.target_value || 0;
    const remainingValue = Math.abs(targetValue - currentValue);
    
    // Calculate progress rate from historical data
    const progressRate = this.calculateProgressRate(goal, logs);
    
    // Time analysis
    const targetDate = goal.target_date ? new Date(goal.target_date) : new Date();
    const today = new Date();
    const remainingDays = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    const requiredDailyRate = remainingDays > 0 ? remainingValue / remainingDays : Infinity;
    const currentDailyRate = progressRate.daily_average;
    
    // Base probability calculation
    let baseProbability = remainingDays > 0 ? Math.min(1, currentDailyRate / requiredDailyRate) : 0;
    
    // Factor analysis
    const factors = this.analyzeGoalFactors(goal, logs);
    const factorAdjustment = factors.reduce((sum, factor) => sum + factor.impact, 0) / factors.length;
    
    const adjustedProbability = Math.max(0, Math.min(1, baseProbability + factorAdjustment));
    
    // Confidence based on data consistency and trends
    const confidence = this.calculateConfidence(logs, progressRate.consistency);

    // Timeline assessment
    const estimatedDays = currentDailyRate > 0 ? Math.ceil(remainingValue / currentDailyRate) : Infinity;
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

    return {
      probability: adjustedProbability,
      confidence,
      factors,
      timeline_assessment: {
        on_track: currentDailyRate >= requiredDailyRate * 0.8, // 80% threshold
        estimated_completion: estimatedCompletion.toISOString().split('T')[0],
        required_rate: requiredDailyRate,
        current_rate: currentDailyRate
      }
    };
  }

  /**
   * Predict behavioral changes and habit formation
   */
  static predictBehaviorChanges(logs: DailyLog[]): {
    habit_formation_likelihood: Record<string, number>;
    behavior_change_windows: Array<{
      period: string;
      likelihood: number;
      recommended_changes: string[];
    }>;
    motivation_cycles: {
      current_phase: 'building' | 'plateau' | 'declining' | 'recovering';
      next_peak: string;
      next_low: string;
    };
  } {
    const recentTrends = this.calculateTrends(logs.slice(0, 30));
    const consistency = this.calculateBehaviorConsistency(logs);
    
    // Habit formation predictions
    const habitLikelihood = {
      sleep_routine: this.predictHabitFormation('sleep_hours', logs),
      exercise_habit: this.predictHabitFormation('steps', logs),
      hydration_habit: this.predictHabitFormation('hydration_ml', logs),
      mood_stability: this.predictHabitFormation('mood', logs)
    };

    // Behavior change windows
    const changeWindows = this.identifyChangeWindows(logs);
    
    // Motivation cycle analysis
    const motivationCycle = this.analyzeMotivationCycle(logs);

    return {
      habit_formation_likelihood: habitLikelihood,
      behavior_change_windows: changeWindows,
      motivation_cycles: motivationCycle
    };
  }

  // Private helper methods
  private static analyzeCurrentState(logs: DailyLog[]): {
    current_health_score: number;
    stability: number;
    key_metrics: Record<string, { value: number; trend: number; consistency: number }>;
  } {
    if (logs.length === 0) {
      return { 
        current_health_score: 0, 
        stability: 0, 
        key_metrics: {} 
      };
    }

    const latest = logs[0];
    const currentScore = unifiedHealthScore(latest);
    
    // Calculate stability (lower variance = higher stability)
    const recentScores = logs.slice(0, 7).map(log => unifiedHealthScore(log));
    const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / recentScores.length;
    const stability = Math.max(0, 1 - (Math.sqrt(variance) / 50)); // Normalize to 0-1

    const keyMetrics: Record<string, { value: number; trend: number; consistency: number }> = {};
    const metrics = ['sleep_hours', 'hydration_ml', 'steps', 'mood', 'recovery_score'];

    metrics.forEach(metric => {
      const values = logs.slice(0, 14).map(log => log[metric as keyof DailyLog]).filter(v => v !== null) as number[];
      if (values.length >= 7) {
        const trend = this.calculateTrendDirection(values);
        const consistency = this.calculateMetricConsistency(values);
        keyMetrics[metric] = {
          value: values[0],
          trend,
          consistency
        };
      }
    });

    return {
      current_health_score: currentScore,
      stability,
      key_metrics: keyMetrics
    };
  }

  private static calculateTrends(logs: DailyLog[]): Record<string, { direction: number; acceleration: number; confidence: number }> {
    const trends: Record<string, { direction: number; acceleration: number; confidence: number }> = {};
    const metrics = ['sleep_hours', 'hydration_ml', 'steps', 'mood', 'recovery_score'];

    metrics.forEach(metric => {
      const values = logs.slice(0, 30).map(log => log[metric as keyof DailyLog]).filter(v => v !== null) as number[];
      if (values.length >= 14) {
        const trend = this.calculateAdvancedTrend(values);
        trends[metric] = trend;
      }
    });

    return trends;
  }

  private static generateScenario(
    logs: DailyLog[], 
    goals: UserGoal[], 
    timeframe: '30_day' | '6_month' | '1_year',
    scenario: 'best_case' | 'realistic' | 'worst_case',
    baseAnalysis: any,
    trends: any
  ): FutureProjection {
    const timeframeDays = timeframe === '30_day' ? 30 : timeframe === '6_month' ? 180 : 365;
    const scenarioMultiplier = scenario === 'best_case' ? 1.5 : scenario === 'worst_case' ? 0.5 : 1.0;
    
    // Project health score
    const currentScore = baseAnalysis.current_health_score;
    const trendImpact = this.calculateAverageTrendImpact(trends);
    const projectedScore = Math.max(0, Math.min(100, currentScore + (trendImpact * timeframeDays * scenarioMultiplier)));
    
    // Calculate specific projections
    const sleepProjection = this.projectMetric('sleep_hours', logs, timeframeDays, scenarioMultiplier);
    const fitnessProjection = this.projectMetric('steps', logs, timeframeDays, scenarioMultiplier);
    const weightProjection = this.projectMetric('weight_kg', logs, timeframeDays, scenarioMultiplier * 0.5); // Weight changes slower
    const moodProjection = this.projectMetric('mood', logs, timeframeDays, scenarioMultiplier);
    
    // Generate risks and opportunities
    const risks = this.generateRisks(scenario, timeframe, trends);
    const opportunities = this.generateOpportunities(scenario, timeframe, trends);
    
    // Calculate goal achievement probabilities
    const goalProbabilities = goals.map(goal => ({
      goal_id: goal.id,
      probability: this.calculateGoalAchievementProbability(goal, logs).probability * scenarioMultiplier
    }));

    // Generate recommendations
    const recommendations = this.generateScenarioRecommendations(scenario, trends, timeframe);

    // Confidence calculation
    const dataQuality = Math.min(1, logs.length / 30); // More data = higher confidence
    const trendConsistency = baseAnalysis.stability;
    const confidence = (dataQuality + trendConsistency) / 2;

    return {
      id: '', // Will be set when saved to DB
      user_id: '', // Will be set when saved to DB
      projection_type: timeframe,
      scenario_type: scenario,
      generated_at: new Date().toISOString(),
      input_data: {
        logs_analyzed: logs.length,
        goals_considered: goals.length,
        base_analysis: baseAnalysis,
        trends_used: trends
      },
      health_score_projection: {
        current: currentScore,
        predicted: projectedScore,
        confidence: confidence
      },
      goal_achievement_probability: goalProbabilities.length > 0 ? 
        goalProbabilities.reduce((sum, g) => sum + g.probability, 0) / goalProbabilities.length : null,
      sleep_projection: sleepProjection,
      fitness_projection: fitnessProjection,
      weight_projection: weightProjection,
      mood_projection: moodProjection,
      risks,
      opportunities,
      recommended_actions: recommendations,
      confidence_score: confidence,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
  }

  private static calculateProgressRate(goal: UserGoal, logs: DailyLog[]): {
    daily_average: number;
    consistency: number;
  } {
    // Simplified progress rate calculation
    // In a real implementation, this would track goal-specific metrics over time
    const recentLogs = logs.slice(0, 30);
    
    // Map goal category to relevant metric
    const metricMap: Record<string, keyof DailyLog> = {
      'weight': 'weight_kg',
      'fitness': 'steps',
      'sleep': 'sleep_hours',
      'health': 'recovery_score'
    };

    const relevantMetric = metricMap[goal.category.toLowerCase()];
    if (!relevantMetric) {
      return { daily_average: 0, consistency: 0 };
    }

    const values = recentLogs.map(log => log[relevantMetric]).filter(v => v !== null) as number[];
    if (values.length < 7) {
      return { daily_average: 0, consistency: 0 };
    }

    // Calculate average daily change
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(Math.abs(values[i] - values[i-1]));
    }

    const dailyAverage = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const consistency = 1 - (this.calculateVariance(changes) / Math.max(1, dailyAverage));

    return {
      daily_average: dailyAverage,
      consistency: Math.max(0, Math.min(1, consistency))
    };
  }

  private static analyzeGoalFactors(goal: UserGoal, logs: DailyLog[]): Array<{
    factor: string;
    impact: number;
    description: string;
  }> {
    const factors = [];
    
    // Analyze consistency factor
    const recentConsistency = this.calculateBehaviorConsistency(logs.slice(0, 14));
    factors.push({
      factor: 'Consistency',
      impact: (recentConsistency - 0.5) * 0.3, // -0.15 to +0.15
      description: `Your recent consistency is ${(recentConsistency * 100).toFixed(0)}%`
    });

    // Analyze momentum factor
    const momentum = this.calculateMomentum(logs);
    factors.push({
      factor: 'Momentum',
      impact: momentum * 0.2, // -0.2 to +0.2
      description: `Current momentum is ${momentum > 0 ? 'positive' : 'negative'}`
    });

    // Priority factor
    const priorityImpact = (goal.priority === 'high' ? 0.1 : goal.priority === 'critical' ? 0.15 : 0);
    factors.push({
      factor: 'Priority Level',
      impact: priorityImpact,
      description: `Goal priority: ${goal.priority}`
    });

    return factors;
  }

  private static calculateConfidence(logs: DailyLog[], consistency: number): number {
    const dataAmount = Math.min(1, logs.length / 30);
    const recentActivity = logs.slice(0, 7).filter(log => 
      log.sleep_hours || log.steps || log.mood
    ).length / 7;
    
    return (dataAmount + consistency + recentActivity) / 3;
  }

  private static calculateTrendDirection(values: number[]): number {
    if (values.length < 3) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(-Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / firstAvg;
  }

  private static calculateMetricConsistency(values: number[]): number {
    if (values.length < 3) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation
    
    return Math.max(0, 1 - cv); // Lower CV = higher consistency
  }

  private static calculateAdvancedTrend(values: number[]): { direction: number; acceleration: number; confidence: number } {
    const direction = this.calculateTrendDirection(values);
    
    // Calculate acceleration (change in trend)
    const firstQuarter = values.slice(0, Math.floor(values.length / 4));
    const lastQuarter = values.slice(-Math.floor(values.length / 4));
    const firstTrend = this.calculateTrendDirection(firstQuarter);
    const lastTrend = this.calculateTrendDirection(lastQuarter);
    const acceleration = lastTrend - firstTrend;
    
    // Confidence based on trend consistency
    const consistency = this.calculateMetricConsistency(values);
    const confidence = consistency * Math.min(1, values.length / 14);
    
    return { direction, acceleration, confidence };
  }

  private static calculateAverageTrendImpact(trends: Record<string, any>): number {
    const trendValues = Object.values(trends).map(trend => trend.direction);
    if (trendValues.length === 0) return 0;
    
    return trendValues.reduce((sum, val) => sum + val, 0) / trendValues.length;
  }

  private static projectMetric(metric: keyof DailyLog, logs: DailyLog[], days: number, multiplier: number): any {
    const values = logs.slice(0, 30).map(log => log[metric]).filter(v => v !== null) as number[];
    if (values.length < 7) return null;

    const current = values[0];
    const trend = this.calculateTrendDirection(values);
    const projected = current + (trend * current * days / 30 * multiplier);

    return {
      current,
      predicted: projected,
      change: projected - current,
      trend_direction: trend > 0.05 ? 'improving' : trend < -0.05 ? 'declining' : 'stable'
    };
  }

  private static generateRisks(scenario: string, timeframe: string, trends: any): any[] {
    // Implementation would generate scenario-specific risks
    return [];
  }

  private static generateOpportunities(scenario: string, timeframe: string, trends: any): any[] {
    // Implementation would generate scenario-specific opportunities
    return [];
  }

  private static generateScenarioRecommendations(scenario: string, trends: any, timeframe: string): any[] {
    // Implementation would generate scenario-specific recommendations
    return [];
  }

  private static predictHabitFormation(metric: keyof DailyLog, logs: DailyLog[]): number {
    const values = logs.slice(0, 30).map(log => log[metric]).filter(v => v !== null) as number[];
    if (values.length < 14) return 0;

    const consistency = this.calculateMetricConsistency(values);
    const trend = Math.abs(this.calculateTrendDirection(values));
    const recency = Math.min(1, values.length / 30);

    return (consistency + (1 - trend) + recency) / 3; // Higher consistency and lower volatility = higher habit formation likelihood
  }

  private static identifyChangeWindows(logs: DailyLog[]): Array<{
    period: string;
    likelihood: number;
    recommended_changes: string[];
  }> {
    // Implementation would identify optimal periods for behavior change
    return [];
  }

  private static analyzeMotivationCycle(logs: DailyLog[]): {
    current_phase: 'building' | 'plateau' | 'declining' | 'recovering';
    next_peak: string;
    next_low: string;
  } {
    // Implementation would analyze motivation cycles from mood and activity data
    return {
      current_phase: 'building',
      next_peak: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      next_low: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private static calculateBehaviorConsistency(logs: DailyLog[]): number {
    if (logs.length < 7) return 0;

    const metrics = ['sleep_hours', 'steps', 'mood'];
    let totalConsistency = 0;
    let validMetrics = 0;

    metrics.forEach(metric => {
      const values = logs.map(log => log[metric as keyof DailyLog]).filter(v => v !== null) as number[];
      if (values.length >= 7) {
        totalConsistency += this.calculateMetricConsistency(values);
        validMetrics++;
      }
    });

    return validMetrics > 0 ? totalConsistency / validMetrics : 0;
  }

  private static calculateMomentum(logs: DailyLog[]): number {
    if (logs.length < 14) return 0;

    const recentScores = logs.slice(0, 7).map(log => unifiedHealthScore(log));
    const olderScores = logs.slice(7, 14).map(log => unifiedHealthScore(log));

    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

    return (recentAvg - olderAvg) / 100; // Normalize to -1 to 1
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}