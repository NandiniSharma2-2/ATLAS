// Life-Aware Planning Backend Functions
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PlanningEngine, type PlanningContext, type PlanTask } from "./services/planning-engine";
import type { DailyLog } from "./atlas-scoring";

// Validation schemas
const CreateScheduleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  schedule_type: z.string().min(1).max(50),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  days_of_week: z.array(z.number().min(0).max(6)).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_flexible: z.boolean().default(false),
  priority_level: z.number().min(1).max(5).default(3),
  can_reschedule: z.boolean().default(true),
  buffer_minutes: z.number().min(0).max(120).default(0),
  energy_required: z.number().min(1).max(10).default(5),
  focus_required: z.number().min(1).max(10).default(5)
});

const GeneratePlanSchema = z.object({
  plan_type: z.enum(['daily', 'weekly', 'monthly']),
  target_date: z.string(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(300),
    description: z.string().optional(),
    category: z.string().min(1).max(50),
    estimated_duration_minutes: z.number().min(15).max(480),
    energy_requirement: z.number().min(1).max(10),
    focus_requirement: z.number().min(1).max(10),
    priority_level: z.number().min(1).max(5),
    deadline: z.string().optional(),
    is_splittable: z.boolean().default(false),
    related_goal_id: z.string().uuid().optional()
  })),
  preferences: z.object({
    work_hours_start: z.string().default('09:00'),
    work_hours_end: z.string().default('17:00'),
    break_duration: z.number().min(5).max(60).default(15),
    max_focus_duration: z.number().min(30).max(180).default(90)
  }).optional()
});

const AdaptPlanSchema = z.object({
  plan_id: z.string().uuid(),
  missed_tasks: z.array(z.string()),
  new_constraints: z.object({
    energy_level: z.number().min(1).max(10).optional(),
    available_time_today: z.number().min(0).max(1440).optional(),
    stress_level: z.number().min(1).max(10).optional(),
    urgent_tasks: z.array(z.string()).optional()
  }).optional()
});

const CompleteTaskSchema = z.object({
  task_id: z.string().uuid(),
  completion_status: z.enum(['completed', 'skipped', 'rescheduled']),
  actual_duration_minutes: z.number().min(0).max(480).optional(),
  completion_notes: z.string().optional()
});

// ==================== SCHEDULE MANAGEMENT ====================

/**
 * Create a user schedule/commitment
 */
export const createUserSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(CreateScheduleSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const { data: schedule, error } = await supabase
        .from("user_schedules")
        .insert({
          ...data,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      return { schedule };
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw new Error('Failed to create schedule');
    }
  });

/**
 * Get user schedules
 */
export const getUserSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    active_only: z.boolean().default(true),
    schedule_type: z.string().optional()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      let query = supabase
        .from("user_schedules")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data.active_only) {
        query = query.eq("is_active", true);
      }

      if (data.schedule_type) {
        query = query.eq("schedule_type", data.schedule_type);
      }

      const { data: schedules, error } = await query;

      if (error) throw error;

      return { schedules: schedules || [] };
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw new Error('Failed to fetch schedules');
    }
  });

// ==================== PLAN GENERATION ====================

/**
 * Generate adaptive plan based on user patterns and current state
 */
export const generateAdaptivePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(GeneratePlanSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get user's historical data for pattern analysis
      const { data: logs, error: logsError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(60);

      if (logsError) throw logsError;

      // Get user schedules/commitments
      const { data: schedules, error: schedulesError } = await supabase
        .from("user_schedules")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (schedulesError) throw schedulesError;

      // Get user goals
      const { data: goals, error: goalsError } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active");

      if (goalsError) throw goalsError;

      // Analyze user patterns
      const userPatterns = logs && logs.length >= 14 ? 
        PlanningEngine.analyzeUserPatterns(logs as DailyLog[]) : 
        this.getDefaultPatterns();

      // Build planning context
      const context_data: PlanningContext = {
        energy_patterns: userPatterns.energy_by_hour,
        productivity_patterns: userPatterns.productivity_by_day,
        health_metrics: this.calculateRecentHealthMetrics(logs || []),
        existing_commitments: schedules || [],
        goals: goals || [],
        preferences: data.preferences || {
          work_hours_start: '09:00',
          work_hours_end: '17:00',
          break_duration: 15,
          max_focus_duration: 90
        }
      };

      // Generate plan based on type
      let planResult: any;
      if (data.plan_type === 'daily') {
        planResult = PlanningEngine.generateDailyPlan(
          data.target_date,
          context_data,
          data.tasks
        );
      } else if (data.plan_type === 'weekly') {
        // Convert tasks to weekly goals format
        const weeklyGoals = this.convertTasksToWeeklyGoals(data.tasks, goals || []);
        planResult = PlanningEngine.generateWeeklyPlan(
          data.target_date,
          context_data,
          weeklyGoals
        );
      } else {
        throw new Error('Monthly plans not yet implemented');
      }

      // Save plan to database
      const { data: savedPlan, error: planError } = await supabase
        .from("generated_plans")
        .insert({
          ...planResult.plan,
          user_id: userId
        })
        .select()
        .single();

      if (planError) throw planError;

      // Save individual tasks
      if (data.plan_type === 'daily' && planResult.scheduled_tasks) {
        const tasksToSave = planResult.scheduled_tasks.map((scheduledTask: any) => ({
          plan_id: savedPlan.id,
          user_id: userId,
          title: scheduledTask.task.title,
          description: scheduledTask.task.description,
          category: scheduledTask.task.category,
          scheduled_date: data.target_date,
          scheduled_start: scheduledTask.scheduled_start,
          scheduled_end: scheduledTask.scheduled_end,
          estimated_duration_minutes: scheduledTask.task.estimated_duration_minutes,
          energy_requirement: scheduledTask.task.energy_requirement,
          focus_requirement: scheduledTask.task.focus_requirement,
          priority_level: scheduledTask.task.priority_level,
          is_moveable: !scheduledTask.task.deadline,
          is_splittable: scheduledTask.task.is_splittable,
          related_goal_id: scheduledTask.task.related_goal_id,
          status: 'scheduled'
        }));

        if (tasksToSave.length > 0) {
          const { error: tasksError } = await supabase
            .from("plan_tasks")
            .insert(tasksToSave);

          if (tasksError) {
            console.error('Error saving plan tasks:', tasksError);
          }
        }
      }

      return {
        plan: savedPlan,
        ...planResult,
        context_used: {
          patterns_available: logs && logs.length >= 14,
          schedules_count: schedules?.length || 0,
          goals_count: goals?.length || 0
        }
      };
    } catch (error) {
      console.error('Error generating adaptive plan:', error);
      throw new Error('Failed to generate adaptive plan');
    }
  });

/**
 * Adapt existing plan based on missed tasks or changed circumstances
 */
export const adaptExistingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(AdaptPlanSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get original plan
      const { data: originalPlan, error: planError } = await supabase
        .from("generated_plans")
        .select("*")
        .eq("id", data.plan_id)
        .eq("user_id", userId)
        .single();

      if (planError || !originalPlan) {
        throw new Error('Plan not found or access denied');
      }

      // Get current context (similar to generateAdaptivePlan)
      const contextData = await this.getCurrentPlanningContext(supabase, userId);

      // Merge new constraints
      const mergedContext = {
        ...contextData,
        ...data.new_constraints
      };

      // Use PlanningEngine to adapt the plan
      const adaptationResult = PlanningEngine.adaptivePlan(
        originalPlan,
        data.missed_tasks,
        data.new_constraints || {},
        contextData
      );

      // Update plan in database
      const { data: updatedPlan, error: updateError } = await supabase
        .from("generated_plans")
        .update({
          plan_structure: adaptationResult.updated_plan.plan_structure,
          adaptations_made: adaptationResult.updated_plan.adaptations_made,
          estimated_success_probability: adaptationResult.updated_plan.estimated_success_probability,
          status: 'active'
        })
        .eq("id", data.plan_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log adaptation
      const { error: adaptationLogError } = await supabase
        .from("plan_adaptations")
        .insert({
          original_plan_id: data.plan_id,
          user_id: userId,
          trigger_reason: 'manual_adaptation',
          trigger_data: {
            missed_tasks: data.missed_tasks,
            new_constraints: data.new_constraints
          },
          changes_made: adaptationResult.changes_made,
          impact_assessment: adaptationResult.impact_assessment,
          new_success_probability: adaptationResult.updated_plan.estimated_success_probability
        });

      if (adaptationLogError) {
        console.error('Error logging adaptation:', adaptationLogError);
      }

      return {
        updated_plan: updatedPlan,
        changes: adaptationResult.changes_made,
        impact: adaptationResult.impact_assessment
      };
    } catch (error) {
      console.error('Error adapting plan:', error);
      throw new Error('Failed to adapt plan');
    }
  });

// ==================== TASK MANAGEMENT ====================

/**
 * Complete a planned task
 */
export const completeTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(CompleteTaskSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const updateData: any = {
        status: data.completion_status,
        completion_notes: data.completion_notes,
        updated_at: new Date().toISOString()
      };

      if (data.completion_status === 'completed') {
        updateData.actual_end_time = new Date().toISOString();
        if (data.actual_duration_minutes) {
          const actualStartTime = new Date();
          actualStartTime.setMinutes(actualStartTime.getMinutes() - data.actual_duration_minutes);
          updateData.actual_start_time = actualStartTime.toISOString();
        }
      }

      const { data: task, error } = await supabase
        .from("plan_tasks")
        .update(updateData)
        .eq("id", data.task_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return { task };
    } catch (error) {
      console.error('Error completing task:', error);
      throw new Error('Failed to complete task');
    }
  });

/**
 * Get planned tasks for a date range
 */
export const getPlannedTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    start_date: z.string(),
    end_date: z.string().optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'skipped', 'rescheduled']).optional(),
    plan_id: z.string().uuid().optional()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      let query = supabase
        .from("plan_tasks")
        .select("*")
        .eq("user_id", userId)
        .gte("scheduled_date", data.start_date)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_start", { ascending: true });

      if (data.end_date) {
        query = query.lte("scheduled_date", data.end_date);
      }

      if (data.status) {
        query = query.eq("status", data.status);
      }

      if (data.plan_id) {
        query = query.eq("plan_id", data.plan_id);
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      return { tasks: tasks || [] };
    } catch (error) {
      console.error('Error fetching planned tasks:', error);
      throw new Error('Failed to fetch planned tasks');
    }
  });

// ==================== ANALYTICS & INSIGHTS ====================

/**
 * Analyze planning effectiveness
 */
export const analyzePlanningEffectiveness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    days_back: z.number().min(7).max(90).default(30)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - data.days_back);

      // Get completed plans and tasks
      const { data: plans, error: plansError } = await supabase
        .from("generated_plans")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;

      const { data: tasks, error: tasksError } = await supabase
        .from("plan_tasks")
        .select("*")
        .eq("user_id", userId)
        .gte("scheduled_date", startDate.toISOString().split('T')[0])
        .order("scheduled_date", { ascending: false });

      if (tasksError) throw tasksError;

      // Calculate analytics
      const analytics = this.calculatePlanningAnalytics(plans || [], tasks || []);

      return {
        analytics,
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          days: data.days_back
        },
        plans_analyzed: plans?.length || 0,
        tasks_analyzed: tasks?.length || 0
      };
    } catch (error) {
      console.error('Error analyzing planning effectiveness:', error);
      throw new Error('Failed to analyze planning effectiveness');
    }
  });

// ==================== HELPER METHODS ====================

/**
 * Get default patterns when insufficient data
 */
function getDefaultPatterns() {
  return {
    energy_by_hour: {
      '6': 3, '7': 4, '8': 6, '9': 7, '10': 8, '11': 8,
      '12': 7, '13': 6, '14': 7, '15': 8, '16': 7, '17': 6,
      '18': 5, '19': 4, '20': 3, '21': 2, '22': 2
    },
    productivity_by_day: {
      '1': 0.8, '2': 0.9, '3': 0.9, '4': 0.8, '5': 0.7, '6': 0.6, '0': 0.5
    },
    optimal_work_periods: [
      { start_hour: 9, end_hour: 11, energy_level: 8 },
      { start_hour: 14, end_hour: 16, energy_level: 7 }
    ],
    break_patterns: {
      preferred_break_duration: 15,
      optimal_break_frequency: 2
    }
  };
}

/**
 * Calculate recent health metrics from logs
 */
function calculateRecentHealthMetrics(logs: any[]): any {
  if (logs.length === 0) {
    return {
      recent_sleep: 7,
      recent_stress: 5,
      recent_energy: 5
    };
  }

  const recentLogs = logs.slice(0, 7);
  
  const avgSleep = recentLogs.reduce((sum, log) => sum + (log.sleep_hours || 7), 0) / recentLogs.length;
  const avgStress = recentLogs.reduce((sum, log) => sum + (log.stress_level || 5), 0) / recentLogs.length;
  const avgEnergy = recentLogs.reduce((sum, log) => sum + (log.energy_level || 5), 0) / recentLogs.length;

  return {
    recent_sleep: avgSleep,
    recent_stress: avgStress,
    recent_energy: avgEnergy
  };
}

/**
 * Convert tasks to weekly goals format
 */
function convertTasksToWeeklyGoals(tasks: any[], goals: any[]): any[] {
  const goalMap = new Map(goals.map(goal => [goal.id, goal]));
  
  const weeklyGoals = tasks.reduce((acc, task) => {
    if (task.related_goal_id && goalMap.has(task.related_goal_id)) {
      const goal = goalMap.get(task.related_goal_id);
      if (!acc.find((wg: any) => wg.goal.id === goal.id)) {
        acc.push({
          goal,
          tasks: tasks.filter(t => t.related_goal_id === goal.id)
        });
      }
    } else {
      // Create temporary goal for unrelated tasks
      if (!acc.find((wg: any) => wg.goal.category === task.category)) {
        acc.push({
          goal: {
            id: `temp-${task.category}`,
            title: `${task.category} Tasks`,
            category: task.category
          },
          tasks: tasks.filter(t => !t.related_goal_id && t.category === task.category)
        });
      }
    }
    return acc;
  }, []);

  return weeklyGoals;
}

/**
 * Get current planning context
 */
async function getCurrentPlanningContext(supabase: any, userId: string): Promise<PlanningContext> {
  // This would fetch current user state, patterns, etc.
  // Simplified implementation
  return {
    energy_patterns: {},
    productivity_patterns: {},
    health_metrics: { recent_sleep: 7, recent_stress: 5, recent_energy: 5 },
    existing_commitments: [],
    goals: [],
    preferences: {
      work_hours_start: '09:00',
      work_hours_end: '17:00',
      break_duration: 15,
      max_focus_duration: 90
    }
  };
}

/**
 * Calculate planning analytics
 */
function calculatePlanningAnalytics(plans: any[], tasks: any[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const onTimeCompletions = tasks.filter(t => 
    t.status === 'completed' && 
    t.actual_end_time && 
    t.scheduled_end &&
    new Date(t.actual_end_time) <= new Date(`${t.scheduled_date}T${t.scheduled_end}`)
  ).length;

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const punctualityRate = completedTasks > 0 ? (onTimeCompletions / completedTasks) * 100 : 0;

  const avgSuccessProbability = plans.length > 0 ? 
    plans.reduce((sum, plan) => sum + (plan.estimated_success_probability || 0), 0) / plans.length : 0;

  return {
    completion_rate: completionRate,
    punctuality_rate: punctualityRate,
    average_success_probability: avgSuccessProbability * 100,
    total_plans: plans.length,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    planning_accuracy: punctualityRate // How often tasks completed on time
  };
}