// Health Memory & Analysis Service
import type { DailyLog } from "../atlas-scoring";
import type { HealthInsight, HealthCorrelation, Habit, HabitCompletion } from "@/integrations/supabase/extended-types";

export class HealthAnalyzer {
  /**
   * Analyzes health trends over a given period
   */
  static analyzeHealthTrends(logs: DailyLog[], days: number = 30): {
    trends: Array<{
      metric: string;
      direction: 'improving' | 'declining' | 'stable';
      change_percentage: number;
      confidence: number;
    }>;
    insights: Array<{
      type: 'trend' | 'pattern' | 'anomaly';
      title: string;
      description: string;
      confidence: number;
    }>;
  } {
    if (logs.length < 7) {
      return { trends: [], insights: [] };
    }

    const recentLogs = logs.slice(0, days);
    const trends = [];
    const insights = [];

    // Analyze each metric
    const metrics = [
      'sleep_hours', 'hydration_ml', 'steps', 'mood', 
      'weight_kg', 'nutrition_score', 'recovery_score'
    ];

    for (const metric of metrics) {
      const values = recentLogs
        .map(log => log[metric as keyof DailyLog])
        .filter(val => val !== null) as number[];
      
      if (values.length < 7) continue;

      const trend = this.calculateTrend(values);
      trends.push({
        metric,
        direction: trend.direction,
        change_percentage: trend.change,
        confidence: trend.confidence
      });

      // Generate insights for significant trends
      if (Math.abs(trend.change) > 10 && trend.confidence > 0.7) {
        insights.push({
          type: 'trend' as const,
          title: `${this.metricDisplayName(metric)} ${trend.direction}`,
          description: `Your ${this.metricDisplayName(metric).toLowerCase()} has ${trend.direction === 'improving' ? 'improved' : 'declined'} by ${Math.abs(trend.change).toFixed(1)}% over the last ${days} days`,
          confidence: trend.confidence
        });
      }
    }

    // Pattern detection
    const patterns = this.detectPatterns(recentLogs);
    insights.push(...patterns);

    // Anomaly detection
    const anomalies = this.detectAnomalies(recentLogs);
    insights.push(...anomalies);

    return { trends, insights };
  }

  /**
   * Detects correlations between different health metrics
   */
  static findHealthCorrelations(logs: DailyLog[]): Array<{
    factor_a: string;
    factor_b: string;
    correlation: number;
    strength: 'weak' | 'moderate' | 'strong';
    description: string;
    sample_size: number;
  }> {
    if (logs.length < 14) return [];

    const correlations = [];
    const metrics = ['sleep_hours', 'hydration_ml', 'steps', 'mood', 'recovery_score'];

    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const factorA = metrics[i];
        const factorB = metrics[j];
        
        const correlation = this.calculateCorrelation(logs, factorA, factorB);
        
        if (Math.abs(correlation.r) > 0.3) { // Only significant correlations
          correlations.push({
            factor_a: factorA,
            factor_b: factorB,
            correlation: correlation.r,
            strength: Math.abs(correlation.r) > 0.7 ? 'strong' : 
                     Math.abs(correlation.r) > 0.5 ? 'moderate' : 'weak',
            description: this.describeCorrelation(factorA, factorB, correlation.r),
            sample_size: correlation.n
          });
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Calculates habit consistency score
   */
  static calculateHabitConsistency(completions: HabitCompletion[], habit: Habit, days: number = 30): {
    consistency_score: number;
    completion_rate: number;
    streak_current: number;
    streak_longest: number;
    pattern_analysis: {
      best_days: string[];
      missed_days_pattern: string;
    };
  } {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    
    const recentCompletions = completions.filter(c => 
      new Date(c.completed_date) >= targetDate
    ).sort((a, b) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime());

    const totalDays = days;
    const completedDays = recentCompletions.length;
    const completion_rate = completedDays / totalDays;

    // Calculate streaks
    const streaks = this.calculateStreaks(recentCompletions);
    
    // Analyze patterns
    const dayOfWeekCounts = new Array(7).fill(0);
    recentCompletions.forEach(completion => {
      const dayOfWeek = new Date(completion.completed_date).getDay();
      dayOfWeekCounts[dayOfWeek]++;
    });

    const bestDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      .map((day, index) => ({ day, count: dayOfWeekCounts[index] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.day);

    const consistency_score = this.calculateConsistencyScore(completion_rate, streaks.current, streaks.longest);

    return {
      consistency_score,
      completion_rate,
      streak_current: streaks.current,
      streak_longest: streaks.longest,
      pattern_analysis: {
        best_days: bestDays,
        missed_days_pattern: this.analyzeMissedPattern(recentCompletions, totalDays)
      }
    };
  }

  // Private helper methods
  private static calculateTrend(values: number[]): {
    direction: 'improving' | 'declining' | 'stable';
    change: number;
    confidence: number;
  } {
    const n = values.length;
    const firstHalf = values.slice(0, Math.floor(n / 2));
    const secondHalf = values.slice(-Math.floor(n / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    const variance = this.calculateVariance(values);
    const confidence = Math.max(0, Math.min(1, (Math.abs(change) / 10) * (1 - (variance / 100))));
    
    return {
      direction: Math.abs(change) < 5 ? 'stable' : change > 0 ? 'improving' : 'declining',
      change,
      confidence
    };
  }

  private static calculateCorrelation(logs: DailyLog[], factorA: string, factorB: string): { r: number; n: number } {
    const pairs = logs
      .map(log => ({
        a: log[factorA as keyof DailyLog],
        b: log[factorB as keyof DailyLog]
      }))
      .filter(pair => pair.a !== null && pair.b !== null) as Array<{ a: number; b: number }>;

    if (pairs.length < 5) return { r: 0, n: 0 };

    const n = pairs.length;
    const sumA = pairs.reduce((sum, pair) => sum + pair.a, 0);
    const sumB = pairs.reduce((sum, pair) => sum + pair.b, 0);
    const sumAB = pairs.reduce((sum, pair) => sum + (pair.a * pair.b), 0);
    const sumA2 = pairs.reduce((sum, pair) => sum + (pair.a * pair.a), 0);
    const sumB2 = pairs.reduce((sum, pair) => sum + (pair.b * pair.b), 0);

    const numerator = (n * sumAB) - (sumA * sumB);
    const denominator = Math.sqrt(((n * sumA2) - (sumA * sumA)) * ((n * sumB2) - (sumB * sumB)));

    return {
      r: denominator === 0 ? 0 : numerator / denominator,
      n
    };
  }

  private static detectPatterns(logs: DailyLog[]): Array<{
    type: 'pattern';
    title: string;
    description: string;
    confidence: number;
  }> {
    const patterns = [];
    
    // Weekly patterns
    const dayOfWeekData = this.groupByDayOfWeek(logs);
    const weekendEffect = this.analyzeWeekendEffect(dayOfWeekData);
    
    if (weekendEffect.significant) {
      patterns.push({
        type: 'pattern' as const,
        title: 'Weekend Pattern Detected',
        description: weekendEffect.description,
        confidence: weekendEffect.confidence
      });
    }

    return patterns;
  }

  private static detectAnomalies(logs: DailyLog[]): Array<{
    type: 'anomaly';
    title: string;
    description: string;
    confidence: number;
  }> {
    // Implementation for anomaly detection
    return [];
  }

  private static metricDisplayName(metric: string): string {
    const names: Record<string, string> = {
      sleep_hours: 'Sleep Quality',
      hydration_ml: 'Hydration',
      steps: 'Activity Level',
      mood: 'Mood',
      weight_kg: 'Weight',
      nutrition_score: 'Nutrition',
      recovery_score: 'Recovery'
    };
    return names[metric] || metric;
  }

  private static describeCorrelation(factorA: string, factorB: string, correlation: number): string {
    const nameA = this.metricDisplayName(factorA);
    const nameB = this.metricDisplayName(factorB);
    const strength = Math.abs(correlation) > 0.7 ? 'strongly' : 'moderately';
    const direction = correlation > 0 ? 'positively' : 'negatively';
    
    return `${nameA} is ${strength} ${direction} correlated with ${nameB}`;
  }

  private static calculateStreaks(completions: HabitCompletion[]): { current: number; longest: number } {
    if (completions.length === 0) return { current: 0, longest: 0 };

    const sortedDates = completions
      .map(c => new Date(c.completed_date))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if current streak is active (completed today or yesterday)
    const lastCompletion = sortedDates[0];
    const daysDiff = Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      currentStreak = 1;
      
      // Count consecutive days
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = sortedDates[i - 1];
        const currentDate = sortedDates[i];
        const diff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currentDate = sortedDates[i];
      const diff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  private static calculateConsistencyScore(completionRate: number, currentStreak: number, longestStreak: number): number {
    const rateScore = completionRate * 70; // 70% weight for completion rate
    const streakScore = (currentStreak / Math.max(longestStreak, 1)) * 20; // 20% weight for current streak
    const stabilityScore = Math.min(longestStreak / 7, 1) * 10; // 10% weight for stability (longest streak)
    
    return Math.min(100, Math.round(rateScore + streakScore + stabilityScore));
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static groupByDayOfWeek(logs: DailyLog[]): Record<number, DailyLog[]> {
    const grouped: Record<number, DailyLog[]> = {};
    
    logs.forEach(log => {
      const dayOfWeek = new Date(log.log_date).getDay();
      if (!grouped[dayOfWeek]) grouped[dayOfWeek] = [];
      grouped[dayOfWeek].push(log);
    });
    
    return grouped;
  }

  private static analyzeWeekendEffect(dayData: Record<number, DailyLog[]>): {
    significant: boolean;
    description: string;
    confidence: number;
  } {
    const weekdayData = [1, 2, 3, 4, 5].flatMap(day => dayData[day] || []);
    const weekendData = [0, 6].flatMap(day => dayData[day] || []);
    
    if (weekdayData.length < 5 || weekendData.length < 2) {
      return { significant: false, description: '', confidence: 0 };
    }

    // Compare sleep patterns
    const weekdaySleep = weekdayData.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / weekdayData.length;
    const weekendSleep = weekendData.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / weekendData.length;
    
    const sleepDiff = Math.abs(weekendSleep - weekdaySleep);
    
    if (sleepDiff > 0.5) {
      return {
        significant: true,
        description: `You tend to sleep ${weekendSleep > weekdaySleep ? 'more' : 'less'} on weekends (${sleepDiff.toFixed(1)} hour difference)`,
        confidence: Math.min(0.9, sleepDiff / 2)
      };
    }

    return { significant: false, description: '', confidence: 0 };
  }

  private static analyzeMissedPattern(completions: HabitCompletion[], totalDays: number): string {
    const completionDates = new Set(completions.map(c => c.completed_date));
    const missedCount = totalDays - completions.length;
    
    if (missedCount === 0) return 'Perfect consistency!';
    if (missedCount < totalDays * 0.1) return 'Occasional misses';
    if (missedCount < totalDays * 0.3) return 'Some inconsistency';
    return 'Frequent gaps';
  }
}