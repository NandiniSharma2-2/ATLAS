// Future-Me Simulator Backend Functions
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PredictionEngine } from "./services/prediction-engine";
import type { DailyLog } from "./atlas-scoring";

// Validation schemas
const GenerateProjectionSchema = z.object({
  projection_type: z.enum(['30_day', '6_month', '1_year']),
  include_goals: z.boolean().default(true),
  scenario_types: z.array(z.enum(['best_case', 'realistic', 'worst_case'])).default(['realistic'])
});

const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1).max(50),
  target_value: z.number().optional(),
  target_unit: z.string().max(20).optional(),
  current_value: z.number().optional(),
  target_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

const UpdateGoalProgressSchema = z.object({
  goal_id: z.string().uuid(),
  current_value: z.number(),
  notes: z.string().optional()
});

const SimulationParametersSchema = z.object({
  goals_focus: z.array(z.string().uuid()).optional(),
  behavior_changes: z.record(z.number()).optional(), // metric -> change factor
  external_factors: z.record(z.any()).optional(),
  time_horizon_days: z.number().min(7).max(365).default(30)
});

// ==================== PROJECTION GENERATION ====================

/**
 * Generate future projections based on current data and trends
 */
export const generateFutureProjection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(GenerateProjectionSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get recent health data
      const { data: logs, error: logsError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(90); // 3 months for better trend analysis

      if (logsError) throw logsError;

      if (!logs || logs.length < 14) {
        return {
          error: 'Insufficient data for projection',
          required_days: 14,
          available_days: logs?.length || 0
        };
      }

      // Get user goals if requested
      let goals: any[] = [];
      if (data.include_goals) {
        const { data: goalsData, error: goalsError } = await supabase
          .from("user_goals")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("priority", { ascending: false });

        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
        } else {
          goals = goalsData || [];
        }
      }

      // Generate projections using the PredictionEngine
      let projections: any = {};

      for (const scenarioType of data.scenario_types) {
        switch (data.projection_type) {
          case '30_day':
            const thirtyDayProjections = PredictionEngine.generate30DayProjection(
              logs as DailyLog[], 
              goals
            );
            projections[scenarioType] = thirtyDayProjections[scenarioType];
            break;
          
          case '6_month':
            const sixMonthProjections = PredictionEngine.generate6MonthProjection(
              logs as DailyLog[], 
              goals
            );
            projections[scenarioType] = sixMonthProjections[scenarioType];
            break;
          
          case '1_year':
            const oneYearProjections = PredictionEngine.generate1YearProjection(
              logs as DailyLog[], 
              goals
            );
            projections[scenarioType] = oneYearProjections[scenarioType];
            break;
        }
      }

      // Save projections to database
      const savedProjections = [];
      for (const [scenarioType, projection] of Object.entries(projections)) {
        const { data: savedProjection, error: saveError } = await supabase
          .from("future_projections")
          .insert({
            user_id: userId,
            projection_type: data.projection_type,
            scenario_type: scenarioType,
            ...projection
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving projection:', saveError);
        } else {
          savedProjections.push(savedProjection);
        }
      }

      return {
        projections: savedProjections.length > 0 ? savedProjections : Object.values(projections),
        projection_type: data.projection_type,
        scenarios_generated: data.scenario_types,
        analysis_period: {
          days: logs.length,
          start_date: logs[logs.length - 1].log_date,
          end_date: logs[0].log_date
        },
        goals_considered: goals.length
      };
    } catch (error) {
      console.error('Error generating projection:', error);
      throw new Error('Failed to generate future projection');
    }
  });

/**
 * Get existing projections for the user
 */
export const getUserProjections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    projection_type: z.enum(['30_day', '6_month', '1_year']).optional(),
    limit: z.number().min(1).max(50).default(10),
    include_expired: z.boolean().default(false)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      let query = supabase
        .from("future_projections")
        .select("*")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .limit(data.limit);

      if (data.projection_type) {
        query = query.eq("projection_type", data.projection_type);
      }

      if (!data.include_expired) {
        query = query.gt("expires_at", new Date().toISOString());
      }

      const { data: projections, error } = await query;

      if (error) throw error;

      return { 
        projections: projections || [],
        count: projections?.length || 0
      };
    } catch (error) {
      console.error('Error fetching projections:', error);
      throw new Error('Failed to fetch projections');
    }
  });

/**
 * Run custom simulation with specific parameters
 */
export const runCustomSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(SimulationParametersSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get recent health data
      const { data: logs, error: logsError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(60);

      if (logsError) throw logsError;

      if (!logs || logs.length < 14) {
        return {
          error: 'Insufficient data for simulation',
          required_days: 14,
          available_days: logs?.length || 0
        };
      }

      // Get goals if specified
      let goals: any[] = [];
      if (data.goals_focus && data.goals_focus.length > 0) {
        const { data: goalsData, error: goalsError } = await supabase
          .from("user_goals")
          .select("*")
          .eq("user_id", userId)
          .in("id", data.goals_focus);

        if (goalsError) {
          console.error('Error fetching focused goals:', goalsError);
        } else {
          goals = goalsData || [];
        }
      }

      // Apply behavior changes to the data (simulate what-if scenarios)
      const modifiedLogs = this.applyBehaviorChanges(logs as DailyLog[], data.behavior_changes);

      // Generate simulation based on time horizon
      let simulationResults: any;
      if (data.time_horizon_days <= 30) {
        simulationResults = PredictionEngine.generate30DayProjection(modifiedLogs, goals);
      } else if (data.time_horizon_days <= 180) {
        simulationResults = PredictionEngine.generate6MonthProjection(modifiedLogs, goals);
      } else {
        simulationResults = PredictionEngine.generate1YearProjection(modifiedLogs, goals);
      }

      // Save simulation session
      const { data: session, error: sessionError } = await supabase
        .from("simulation_sessions")
        .insert({
          user_id: userId,
          session_name: `Custom Simulation - ${new Date().toLocaleDateString()}`,
          parameters: {
            goals_focus: data.goals_focus,
            behavior_changes: data.behavior_changes,
            external_factors: data.external_factors,
            time_horizon_days: data.time_horizon_days
          },
          results: simulationResults,
          comparison_baseline: {
            original_data: logs.slice(0, 30),
            modified_data: modifiedLogs.slice(0, 30)
          },
          insights: this.generateSimulationInsights(simulationResults, data)
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error saving simulation session:', sessionError);
      }

      return {
        simulation_id: session?.id,
        results: simulationResults,
        parameters: data,
        insights: this.generateSimulationInsights(simulationResults, data),
        comparison: {
          baseline_health_score: logs.length > 0 ? this.calculateCurrentHealthScore(logs[0]) : 0,
          projected_scores: {
            best_case: simulationResults.best_case?.health_score_projection,
            realistic: simulationResults.realistic?.health_score_projection,
            worst_case: simulationResults.worst_case?.health_score_projection
          }
        }
      };
    } catch (error) {
      console.error('Error running simulation:', error);
      throw new Error('Failed to run custom simulation');
    }
  });

// ==================== GOAL MANAGEMENT ====================

/**
 * Create a new goal
 */
export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(CreateGoalSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const { data: goal, error } = await supabase
        .from("user_goals")
        .insert({
          ...data,
          user_id: userId,
          progress_percentage: 0
        })
        .select()
        .single();

      if (error) throw error;

      return { goal };
    } catch (error) {
      console.error('Error creating goal:', error);
      throw new Error('Failed to create goal');
    }
  });

/**
 * Update goal progress
 */
export const updateGoalProgress = createServerFn({ method: "PUT" })
  .middleware([requireSupabaseAuth])
  .validator(UpdateGoalProgressSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get goal to calculate progress percentage
      const { data: goal, error: goalError } = await supabase
        .from("user_goals")
        .select("*")
        .eq("id", data.goal_id)
        .eq("user_id", userId)
        .single();

      if (goalError || !goal) {
        throw new Error('Goal not found or access denied');
      }

      // Calculate progress percentage
      let progressPercentage = 0;
      if (goal.target_value && goal.target_value > 0) {
        progressPercentage = Math.min(100, Math.max(0, 
          (data.current_value / goal.target_value) * 100
        ));
      }

      // Update goal
      const { data: updatedGoal, error } = await supabase
        .from("user_goals")
        .update({
          current_value: data.current_value,
          progress_percentage: progressPercentage,
          updated_at: new Date().toISOString()
        })
        .eq("id", data.goal_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return { 
        goal: updatedGoal,
        progress_change: progressPercentage - (goal.progress_percentage || 0)
      };
    } catch (error) {
      console.error('Error updating goal progress:', error);
      throw new Error('Failed to update goal progress');
    }
  });

/**
 * Calculate goal achievement probability
 */
export const calculateGoalProbability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    goal_id: z.string().uuid()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get goal
      const { data: goal, error: goalError } = await supabase
        .from("user_goals")
        .select("*")
        .eq("id", data.goal_id)
        .eq("user_id", userId)
        .single();

      if (goalError || !goal) {
        throw new Error('Goal not found or access denied');
      }

      // Get recent health data for analysis
      const { data: logs, error: logsError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(60);

      if (logsError) throw logsError;

      if (!logs || logs.length < 7) {
        return {
          error: 'Insufficient data for probability calculation',
          required_days: 7,
          available_days: logs?.length || 0
        };
      }

      // Calculate probability using PredictionEngine
      const analysis = PredictionEngine.calculateGoalAchievementProbability(
        goal, 
        logs as DailyLog[]
      );

      return {
        goal,
        probability_analysis: analysis,
        data_period: {
          days: logs.length,
          start_date: logs[logs.length - 1].log_date,
          end_date: logs[0].log_date
        }
      };
    } catch (error) {
      console.error('Error calculating goal probability:', error);
      throw new Error('Failed to calculate goal achievement probability');
    }
  });

/**
 * Get all user goals with progress
 */
export const getUserGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
    category: z.string().optional(),
    include_milestones: z.boolean().default(false)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      let query = supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data.status) {
        query = query.eq("status", data.status);
      }

      if (data.category) {
        query = query.eq("category", data.category);
      }

      const { data: goals, error } = await query;

      if (error) throw error;

      let goalsWithMilestones = goals || [];

      if (data.include_milestones && goals && goals.length > 0) {
        const goalIds = goals.map(goal => goal.id);
        
        const { data: milestones, error: milestonesError } = await supabase
          .from("goal_milestones")
          .select("*")
          .in("goal_id", goalIds)
          .order("target_date", { ascending: true });

        if (milestonesError) {
          console.error('Error fetching milestones:', milestonesError);
        } else {
          goalsWithMilestones = goals.map(goal => ({
            ...goal,
            milestones: (milestones || []).filter(m => m.goal_id === goal.id)
          }));
        }
      }

      return { 
        goals: goalsWithMilestones,
        total_goals: goals?.length || 0
      };
    } catch (error) {
      console.error('Error fetching user goals:', error);
      throw new Error('Failed to fetch user goals');
    }
  });

// ==================== HELPER METHODS ====================

/**
 * Apply behavior changes to historical data for what-if simulations
 */
function applyBehaviorChanges(
  logs: DailyLog[], 
  behaviorChanges?: Record<string, number>
): DailyLog[] {
  if (!behaviorChanges || Object.keys(behaviorChanges).length === 0) {
    return logs;
  }

  return logs.map(log => {
    const modifiedLog = { ...log };
    
    Object.entries(behaviorChanges).forEach(([metric, changeFactor]) => {
      const currentValue = log[metric as keyof DailyLog] as number;
      if (typeof currentValue === 'number') {
        (modifiedLog as any)[metric] = Math.max(0, currentValue * changeFactor);
      }
    });

    return modifiedLog;
  });
}

/**
 * Generate insights from simulation results
 */
function generateSimulationInsights(simulationResults: any, parameters: any): any[] {
  const insights = [];

  // Compare scenarios
  if (simulationResults.best_case && simulationResults.worst_case) {
    const scoreDiff = simulationResults.best_case.health_score_projection.predicted - 
                     simulationResults.worst_case.health_score_projection.predicted;
    
    insights.push({
      type: 'scenario_comparison',
      title: 'Scenario Impact Range',
      description: `The difference between best and worst case scenarios is ${scoreDiff.toFixed(1)} health score points`,
      impact: scoreDiff > 20 ? 'high' : scoreDiff > 10 ? 'medium' : 'low'
    });
  }

  // Behavior change impact
  if (parameters.behavior_changes) {
    Object.entries(parameters.behavior_changes).forEach(([metric, factor]) => {
      const changePercent = ((factor - 1) * 100).toFixed(1);
      insights.push({
        type: 'behavior_impact',
        title: `${metric} Change Impact`,
        description: `${changePercent}% change in ${metric} affects overall health trajectory`,
        metric,
        change_factor: factor
      });
    });
  }

  return insights;
}

/**
 * Calculate current health score from log
 */
function calculateCurrentHealthScore(log: DailyLog): number {
  // Import and use the existing scoring function
  const { unifiedHealthScore } = require('./atlas-scoring');
  return unifiedHealthScore(log);
}