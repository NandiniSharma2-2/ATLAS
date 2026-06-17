// Health Memory Backend Functions
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { HealthAnalyzer } from "./services/health-analyzer";
import type { DailyLog } from "./atlas-scoring";

// Validation schemas
const SaveHealthRecordSchema = z.object({
  log_date: z.string(),
  sleep_hours: z.number().min(0).max(24).optional(),
  hydration_ml: z.number().min(0).max(10000).optional(),
  steps: z.number().min(0).max(100000).optional(),
  mood: z.number().min(1).max(10).optional(),
  weight_kg: z.number().min(0).max(500).optional(),
  nutrition_score: z.number().min(0).max(100).optional(),
  recovery_score: z.number().min(0).max(100).optional(),
  energy_level: z.number().min(1).max(10).optional(),
  stress_level: z.number().min(1).max(10).optional(),
  exercise_minutes: z.number().min(0).max(1440).optional(),
  notes: z.string().optional(),
  habits: z.record(z.boolean()).optional()
});

const CreateHabitSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  target_frequency: z.number().min(1).max(10).default(1),
  frequency_period: z.enum(['daily', 'weekly', 'monthly']).default('daily')
});

const LogHabitCompletionSchema = z.object({
  habit_id: z.string().uuid(),
  completed_date: z.string(),
  notes: z.string().optional()
});

// ==================== HEALTH RECORD MANAGEMENT ====================

/**
 * Save or update a daily health record
 */
export const saveHealthRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(SaveHealthRecordSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Check if record already exists for this date
      const { data: existingRecord } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("log_date", data.log_date)
        .maybeSingle();

      if (existingRecord) {
        // Update existing record
        const { data: updatedRecord, error } = await supabase
          .from("daily_logs")
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingRecord.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        return { record: updatedRecord, action: 'updated' };
      } else {
        // Create new record
        const { data: newRecord, error } = await supabase
          .from("daily_logs")
          .insert({
            ...data,
            user_id: userId
          })
          .select()
          .single();

        if (error) throw error;
        return { record: newRecord, action: 'created' };
      }
    } catch (error) {
      console.error('Error saving health record:', error);
      throw new Error('Failed to save health record');
    }
  });

/**
 * Get health history for a specific date range
 */
export const getHealthHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    limit: z.number().min(1).max(365).default(90)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      let query = supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(data.limit);

      if (data.start_date) {
        query = query.gte("log_date", data.start_date);
      }

      if (data.end_date) {
        query = query.lte("log_date", data.end_date);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      return { 
        logs: logs || [],
        count: logs?.length || 0,
        date_range: {
          start: data.start_date || (logs && logs.length > 0 ? logs[logs.length - 1].log_date : null),
          end: data.end_date || (logs && logs.length > 0 ? logs[0].log_date : null)
        }
      };
    } catch (error) {
      console.error('Error fetching health history:', error);
      throw new Error('Failed to fetch health history');
    }
  });

/**
 * Delete a health record
 */
export const deleteHealthRecord = createServerFn({ method: "DELETE" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ record_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", data.record_id)
        .eq("user_id", userId);

      if (error) throw error;

      return { success: true, deleted_id: data.record_id };
    } catch (error) {
      console.error('Error deleting health record:', error);
      throw new Error('Failed to delete health record');
    }
  });

// ==================== HEALTH INSIGHTS & ANALYSIS ====================

/**
 * Analyze health trends and generate insights
 */
export const analyzeHealthTrends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    days: z.number().min(7).max(365).default(30)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get recent health logs
      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(data.days);

      if (error) throw error;

      if (!logs || logs.length < 7) {
        return {
          error: 'Insufficient data for analysis',
          required_days: 7,
          available_days: logs?.length || 0
        };
      }

      // Analyze trends using the HealthAnalyzer service
      const analysis = HealthAnalyzer.analyzeHealthTrends(logs as DailyLog[], data.days);

      // Save insights to database
      const insights = analysis.insights.map(insight => ({
        user_id: userId,
        insight_type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence_score: insight.confidence,
        data_points: {
          analysis_period: data.days,
          logs_analyzed: logs.length,
          generated_at: new Date().toISOString()
        },
        start_date: logs[logs.length - 1].log_date,
        end_date: logs[0].log_date
      }));

      if (insights.length > 0) {
        const { error: insertError } = await supabase
          .from("health_insights")
          .insert(insights);

        if (insertError) {
          console.error('Error saving insights:', insertError);
          // Don't throw - still return analysis even if saving fails
        }
      }

      return {
        trends: analysis.trends,
        insights: analysis.insights,
        analysis_period: {
          days: data.days,
          start_date: logs[logs.length - 1].log_date,
          end_date: logs[0].log_date,
          logs_analyzed: logs.length
        }
      };
    } catch (error) {
      console.error('Error analyzing health trends:', error);
      throw new Error('Failed to analyze health trends');
    }
  });

/**
 * Find health correlations between different metrics
 */
export const findHealthCorrelations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    min_correlation: z.number().min(0).max(1).default(0.3)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get sufficient data for correlation analysis
      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(60); // Need more data for reliable correlations

      if (error) throw error;

      if (!logs || logs.length < 14) {
        return {
          error: 'Insufficient data for correlation analysis',
          required_days: 14,
          available_days: logs?.length || 0,
          correlations: []
        };
      }

      // Find correlations using the HealthAnalyzer
      const correlations = HealthAnalyzer.findHealthCorrelations(logs as DailyLog[]);

      // Filter by minimum correlation strength
      const significantCorrelations = correlations.filter(
        corr => Math.abs(corr.correlation) >= data.min_correlation
      );

      // Save significant correlations to database
      if (significantCorrelations.length > 0) {
        const correlationRecords = significantCorrelations.map(corr => ({
          user_id: userId,
          factor_a: corr.factor_a,
          factor_b: corr.factor_b,
          correlation_strength: corr.correlation,
          sample_size: corr.sample_size
        }));

        // Upsert correlations (update if exists, insert if new)
        const { error: upsertError } = await supabase
          .from("health_correlations")
          .upsert(correlationRecords, {
            onConflict: 'user_id,factor_a,factor_b',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error saving correlations:', upsertError);
        }
      }

      return {
        correlations: significantCorrelations,
        total_found: correlations.length,
        significant_count: significantCorrelations.length,
        analysis_period: {
          days: logs.length,
          start_date: logs[logs.length - 1].log_date,
          end_date: logs[0].log_date
        }
      };
    } catch (error) {
      console.error('Error finding correlations:', error);
      throw new Error('Failed to find health correlations');
    }
  });

// ==================== HABIT MANAGEMENT ====================

/**
 * Create a new habit
 */
export const createHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(CreateHabitSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const { data: habit, error } = await supabase
        .from("habits")
        .insert({
          ...data,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      return { habit };
    } catch (error) {
      console.error('Error creating habit:', error);
      throw new Error('Failed to create habit');
    }
  });

/**
 * Log habit completion
 */
export const logHabitCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(LogHabitCompletionSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Verify habit belongs to user
      const { data: habit, error: habitError } = await supabase
        .from("habits")
        .select("id")
        .eq("id", data.habit_id)
        .eq("user_id", userId)
        .single();

      if (habitError || !habit) {
        throw new Error('Habit not found or access denied');
      }

      // Log completion (upsert to handle duplicate dates)
      const { data: completion, error } = await supabase
        .from("habit_completions")
        .upsert({
          ...data,
          user_id: userId
        }, {
          onConflict: 'habit_id,completed_date'
        })
        .select()
        .single();

      if (error) throw error;

      return { completion };
    } catch (error) {
      console.error('Error logging habit completion:', error);
      throw new Error('Failed to log habit completion');
    }
  });

/**
 * Get habit consistency analysis
 */
export const analyzeHabitConsistency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    habit_id: z.string().uuid(),
    days: z.number().min(7).max(365).default(30)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get habit details
      const { data: habit, error: habitError } = await supabase
        .from("habits")
        .select("*")
        .eq("id", data.habit_id)
        .eq("user_id", userId)
        .single();

      if (habitError || !habit) {
        throw new Error('Habit not found or access denied');
      }

      // Get completions for the specified period
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - data.days);

      const { data: completions, error: completionsError } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("habit_id", data.habit_id)
        .eq("user_id", userId)
        .gte("completed_date", targetDate.toISOString().split('T')[0])
        .order("completed_date", { ascending: false });

      if (completionsError) throw completionsError;

      // Analyze consistency using HealthAnalyzer
      const analysis = HealthAnalyzer.calculateHabitConsistency(
        completions || [], 
        habit, 
        data.days
      );

      return {
        habit,
        analysis,
        completions: completions || [],
        analysis_period: {
          days: data.days,
          start_date: targetDate.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }
      };
    } catch (error) {
      console.error('Error analyzing habit consistency:', error);
      throw new Error('Failed to analyze habit consistency');
    }
  });

/**
 * Get all user habits with recent completion status
 */
export const getUserHabits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    try {
      // Get all active habits
      const { data: habits, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (habitsError) throw habitsError;

      // Get recent completions for all habits
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentCompletions, error: completionsError } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("user_id", userId)
        .gte("completed_date", sevenDaysAgo.toISOString().split('T')[0])
        .order("completed_date", { ascending: false });

      if (completionsError) throw completionsError;

      // Combine habits with completion data
      const habitsWithStatus = (habits || []).map(habit => {
        const habitCompletions = (recentCompletions || []).filter(
          comp => comp.habit_id === habit.id
        );

        const analysis = HealthAnalyzer.calculateHabitConsistency(
          habitCompletions, 
          habit, 
          7
        );

        return {
          ...habit,
          recent_completions: habitCompletions,
          consistency_analysis: analysis
        };
      });

      return { 
        habits: habitsWithStatus,
        total_habits: habits?.length || 0 
      };
    } catch (error) {
      console.error('Error fetching user habits:', error);
      throw new Error('Failed to fetch user habits');
    }
  });

/**
 * Update habit
 */
export const updateHabit = createServerFn({ method: "PUT" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    habit_id: z.string().uuid(),
    name: z.string().min(1).max(100).optional(),
    category: z.string().min(1).max(50).optional(),
    target_frequency: z.number().min(1).max(10).optional(),
    frequency_period: z.enum(['daily', 'weekly', 'monthly']).optional(),
    is_active: z.boolean().optional()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { habit_id, ...updates } = data;

    try {
      const { data: habit, error } = await supabase
        .from("habits")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", habit_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return { habit };
    } catch (error) {
      console.error('Error updating habit:', error);
      throw new Error('Failed to update habit');
    }
  });

/**
 * Delete habit and all its completions
 */
export const deleteHabit = createServerFn({ method: "DELETE" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ habit_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Delete habit (completions will be deleted via CASCADE)
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", data.habit_id)
        .eq("user_id", userId);

      if (error) throw error;

      return { success: true, deleted_habit_id: data.habit_id };
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw new Error('Failed to delete habit');
    }
  });