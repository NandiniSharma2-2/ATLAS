// Explainable Recommendations Backend Functions
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { RecommendationEngine, type RecommendationContext } from "./services/recommendation-engine";
import type { DailyLog } from "./atlas-scoring";

// Validation schemas
const GenerateRecommendationsSchema = z.object({
  categories: z.array(z.string()).default(['sleep', 'exercise', 'nutrition', 'hydration', 'stress', 'habits']),
  focus_goals: z.array(z.string().uuid()).optional(),
  urgency_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  max_recommendations: z.number().min(1).max(15).default(7)
});

const RecommendationFeedbackSchema = z.object({
  recommendation_id: z.string().uuid(),
  user_action: z.enum(['accepted', 'rejected', 'modified', 'ignored']),
  modified_action: z.string().optional(),
  modified_target_value: z.number().optional(),
  modification_reason: z.string().optional(),
  usefulness_rating: z.number().min(1).max(10).optional(),
  clarity_rating: z.number().min(1).max(10).optional(),
  feasibility_rating: z.number().min(1).max(10).optional(),
  feedback_text: z.string().optional(),
  would_want_similar: z.boolean().optional()
});

const TrackOutcomeSchema = z.object({
  recommendation_id: z.string().uuid(),
  started_following_date: z.string().optional(),
  stopped_following_date: z.string().optional(),
  adherence_percentage: z.number().min(0).max(100).optional(),
  baseline_value: z.number().optional(),
  current_value: z.number().optional(),
  target_achieved: z.boolean().optional(),
  actual_impact_score: z.number().min(0).max(1).optional(),
  side_effects: z.record(z.any()).optional(),
  user_satisfaction: z.number().min(1).max(10).optional(),
  lessons_learned: z.string().optional(),
  would_recommend_to_others: z.boolean().optional()
});

const GetRecommendationsSchema = z.object({
  session_id: z.string().uuid().optional(),
  category: z.string().optional(),
  status: z.enum(['active', 'archived', 'followed']).optional(),
  limit: z.number().min(1).max(50).default(20),
  include_explanations: z.boolean().default(true)
});

// ==================== RECOMMENDATION GENERATION ====================

/**
 * Generate comprehensive recommendations based on user data
 */
export const generateRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(GenerateRecommendationsSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Gather user data for analysis
      const contextData = await this.buildRecommendationContext(supabase, userId, data);

      if (contextData.user_data.length < 7) {
        return {
          error: 'Insufficient data for recommendations',
          required_days: 7,
          available_days: contextData.user_data.length
        };
      }

      // Generate recommendations using the RecommendationEngine
      const result = RecommendationEngine.generateRecommendations(
        contextData,
        data.categories
      );

      // Save recommendation session
      const { data: session, error: sessionError } = await supabase
        .from("recommendation_sessions")
        .insert({
          ...result.session,
          user_id: userId
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Save individual recommendations with explanations
      const savedRecommendations = [];
      for (const rec of result.recommendations.slice(0, data.max_recommendations)) {
        // Save recommendation
        const { data: savedRec, error: recError } = await supabase
          .from("recommendations")
          .insert({
            ...rec.recommendation,
            session_id: session.id,
            user_id: userId
          })
          .select()
          .single();

        if (recError) {
          console.error('Error saving recommendation:', recError);
          continue;
        }

        // Save explanation
        const { error: explanationError } = await supabase
          .from("recommendation_explanations")
          .insert({
            ...rec.explanation,
            recommendation_id: savedRec.id
          });

        if (explanationError) {
          console.error('Error saving explanation:', explanationError);
        }

        // Save alternatives
        if (rec.alternatives && rec.alternatives.length > 0) {
          const alternatives = rec.alternatives.map(alt => ({
            primary_recommendation_id: savedRec.id,
            alternative_title: alt.title,
            alternative_description: alt.description,
            alternative_action: alt.description, // Using description as action
            why_not_primary: alt.when_better,
            confidence_score: alt.confidence_score,
            expected_impact_score: alt.confidence_score * 0.8, // Estimate
            effort_required: 5, // Default
            better_if_conditions: { when: alt.when_better }
          }));

          const { error: altError } = await supabase
            .from("recommendation_alternatives")
            .insert(alternatives);

          if (altError) {
            console.error('Error saving alternatives:', altError);
          }
        }

        savedRecommendations.push({
          ...savedRec,
          explanation: rec.explanation,
          alternatives: rec.alternatives,
          confidence_factors: rec.confidence_factors
        });
      }

      return {
        session: session,
        recommendations: savedRecommendations,
        overall_insights: result.overall_insights,
        generation_context: {
          categories_analyzed: data.categories,
          data_period: contextData.user_data.length,
          correlations_found: contextData.correlations.length,
          goals_considered: contextData.goals.length
        }
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  });

/**
 * Generate goal-specific recommendations
 */
export const generateGoalRecommendations = createServerFn({ method: "POST" })
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

      // Build context
      const contextData = await this.buildRecommendationContext(supabase, userId, {
        categories: [goal.category.toLowerCase()],
        focus_goals: [goal.id]
      });

      if (contextData.user_data.length < 7) {
        return {
          error: 'Insufficient data for goal-specific recommendations',
          required_days: 7,
          available_days: contextData.user_data.length
        };
      }

      // Generate goal-specific recommendations
      const recommendations = RecommendationEngine.generateGoalRecommendations(
        goal,
        contextData
      );

      // Create a mini session for these recommendations
      const { data: session, error: sessionError } = await supabase
        .from("recommendation_sessions")
        .insert({
          session_name: `Goal Focus: ${goal.title}`,
          trigger_context: 'goal_specific',
          requested_categories: [goal.category],
          analysis_date_range: {
            start_date: contextData.user_data[contextData.user_data.length - 1]?.log_date || '',
            end_date: contextData.user_data[0]?.log_date || ''
          },
          user_data_analyzed: {
            logs_count: contextData.user_data.length,
            goal_focus: goal.id
          },
          analysis_confidence: recommendations.length > 0 ? 
            recommendations.reduce((sum, rec) => sum + rec.recommendation.confidence_score, 0) / recommendations.length : 0,
          user_id: userId
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Save recommendations
      const savedRecommendations = await this.saveRecommendations(
        supabase, 
        session.id, 
        userId, 
        recommendations
      );

      return {
        goal,
        session,
        recommendations: savedRecommendations
      };
    } catch (error) {
      console.error('Error generating goal recommendations:', error);
      throw new Error('Failed to generate goal-specific recommendations');
    }
  });

/**
 * Generate urgent recommendations for health risks
 */
export const generateUrgentRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    try {
      // Build context with focus on recent critical data
      const contextData = await this.buildRecommendationContext(supabase, userId, {
        categories: ['sleep', 'stress', 'recovery'],
        urgency_level: 'critical'
      });

      if (contextData.user_data.length < 3) {
        return {
          error: 'Insufficient recent data for urgent analysis',
          required_days: 3,
          available_days: contextData.user_data.length
        };
      }

      // Generate urgent recommendations
      const urgentRecommendations = RecommendationEngine.generateUrgentRecommendations(contextData);

      if (urgentRecommendations.length === 0) {
        return {
          message: 'No urgent health concerns detected',
          recommendations: []
        };
      }

      // Create urgent session
      const { data: session, error: sessionError } = await supabase
        .from("recommendation_sessions")
        .insert({
          session_name: `Urgent Health Alert - ${new Date().toLocaleDateString()}`,
          trigger_context: 'urgent_health_alert',
          requested_categories: ['sleep', 'stress', 'recovery'],
          analysis_date_range: {
            start_date: contextData.user_data[Math.min(6, contextData.user_data.length - 1)]?.log_date || '',
            end_date: contextData.user_data[0]?.log_date || ''
          },
          user_data_analyzed: {
            logs_count: contextData.user_data.length,
            urgency_detected: true
          },
          analysis_confidence: 0.9, // High confidence for urgent recommendations
          user_id: userId
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Save urgent recommendations with high priority
      const savedRecommendations = await this.saveRecommendations(
        supabase,
        session.id,
        userId,
        urgentRecommendations.map(rec => ({
          ...rec,
          recommendation: {
            ...rec.recommendation,
            priority_level: 5,
            urgency_level: 5
          }
        }))
      );

      return {
        session,
        urgent_recommendations: savedRecommendations,
        alert_level: 'high'
      };
    } catch (error) {
      console.error('Error generating urgent recommendations:', error);
      throw new Error('Failed to generate urgent recommendations');
    }
  });

// ==================== RECOMMENDATION MANAGEMENT ====================

/**
 * Get user recommendations with optional filtering
 */
export const getRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(GetRecommendationsSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      let query = supabase
        .from("recommendations")
        .select(`
          *,
          recommendation_explanations(*),
          recommendation_alternatives(*),
          recommendation_feedback(*),
          recommendation_outcomes(*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(data.limit);

      if (data.session_id) {
        query = query.eq("session_id", data.session_id);
      }

      if (data.category) {
        query = query.eq("category", data.category);
      }

      const { data: recommendations, error } = await query;

      if (error) throw error;

      // Get session information for recommendations
      if (recommendations && recommendations.length > 0) {
        const sessionIds = [...new Set(recommendations.map(rec => rec.session_id))];
        
        const { data: sessions, error: sessionsError } = await supabase
          .from("recommendation_sessions")
          .select("*")
          .in("id", sessionIds)
          .eq("user_id", userId);

        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError);
        }

        // Attach session info to recommendations
        const sessionsMap = new Map((sessions || []).map(session => [session.id, session]));
        
        const enrichedRecommendations = recommendations.map(rec => ({
          ...rec,
          session: sessionsMap.get(rec.session_id)
        }));

        return {
          recommendations: enrichedRecommendations,
          total_count: recommendations.length
        };
      }

      return {
        recommendations: [],
        total_count: 0
      };
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw new Error('Failed to fetch recommendations');
    }
  });

// ==================== FEEDBACK & TRACKING ====================

/**
 * Submit feedback on a recommendation
 */
export const submitRecommendationFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(RecommendationFeedbackSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Verify recommendation ownership
      const { data: recommendation, error: recError } = await supabase
        .from("recommendations")
        .select("id")
        .eq("id", data.recommendation_id)
        .eq("user_id", userId)
        .single();

      if (recError || !recommendation) {
        throw new Error('Recommendation not found or access denied');
      }

      // Upsert feedback
      const { data: feedback, error } = await supabase
        .from("recommendation_feedback")
        .upsert({
          ...data,
          user_id: userId
        }, {
          onConflict: 'recommendation_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;

      return { feedback };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit recommendation feedback');
    }
  });

/**
 * Track recommendation outcome/results
 */
export const trackRecommendationOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(TrackOutcomeSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Verify recommendation ownership
      const { data: recommendation, error: recError } = await supabase
        .from("recommendations")
        .select("*")
        .eq("id", data.recommendation_id)
        .eq("user_id", userId)
        .single();

      if (recError || !recommendation) {
        throw new Error('Recommendation not found or access denied');
      }

      // Calculate time to see impact if not provided
      let timeToSeeImpact = null;
      if (data.started_following_date && data.current_value && data.baseline_value) {
        const startDate = new Date(data.started_following_date);
        const now = new Date();
        timeToSeeImpact = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Upsert outcome
      const { data: outcome, error } = await supabase
        .from("recommendation_outcomes")
        .upsert({
          ...data,
          user_id: userId,
          time_to_see_impact_days: timeToSeeImpact
        }, {
          onConflict: 'recommendation_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;

      return { 
        outcome,
        recommendation: {
          title: recommendation.title,
          expected_impact: recommendation.expected_impact_score,
          time_expected: recommendation.time_to_see_results_days
        }
      };
    } catch (error) {
      console.error('Error tracking outcome:', error);
      throw new Error('Failed to track recommendation outcome');
    }
  });

// ==================== ANALYTICS ====================

/**
 * Get recommendation effectiveness analytics
 */
export const getRecommendationAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    days_back: z.number().min(7).max(365).default(90),
    category: z.string().optional()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - data.days_back);

      // Get recommendations with feedback and outcomes
      let query = supabase
        .from("recommendations")
        .select(`
          *,
          recommendation_feedback(*),
          recommendation_outcomes(*)
        `)
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (data.category) {
        query = query.eq("category", data.category);
      }

      const { data: recommendations, error } = await query;

      if (error) throw error;

      // Calculate analytics
      const analytics = this.calculateRecommendationAnalytics(recommendations || []);

      return {
        analytics,
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          days: data.days_back
        },
        recommendations_analyzed: recommendations?.length || 0
      };
    } catch (error) {
      console.error('Error getting recommendation analytics:', error);
      throw new Error('Failed to get recommendation analytics');
    }
  });

// ==================== HELPER METHODS ====================

/**
 * Build recommendation context from user data
 */
async function buildRecommendationContext(
  supabase: any, 
  userId: string, 
  options: any
): Promise<RecommendationContext> {
  // Get health logs
  const { data: logs, error: logsError } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .limit(60);

  if (logsError) throw logsError;

  // Get goals (focus on specific goals if provided)
  let goalsQuery = supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (options.focus_goals && options.focus_goals.length > 0) {
    goalsQuery = goalsQuery.in("id", options.focus_goals);
  }

  const { data: goals, error: goalsError } = await goalsQuery;
  if (goalsError) throw goalsError;

  // Get correlations
  const { data: correlations, error: corrError } = await supabase
    .from("health_correlations")
    .select("*")
    .eq("user_id", userId);

  if (corrError) throw corrError;

  // Get recent trends (from insights)
  const { data: trends, error: trendsError } = await supabase
    .from("health_insights")
    .select("*")
    .eq("user_id", userId)
    .eq("insight_type", "trend")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (trendsError) throw trendsError;

  // Get user patterns (simplified - would be more complex in real implementation)
  const { data: patterns, error: patternsError } = await supabase
    .from("user_patterns")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (patternsError) throw patternsError;

  return {
    user_data: logs || [],
    goals: goals || [],
    correlations: correlations || [],
    recent_trends: trends || [],
    user_patterns: patterns || []
  };
}

/**
 * Save recommendations and their explanations
 */
async function saveRecommendations(
  supabase: any,
  sessionId: string,
  userId: string,
  recommendations: any[]
): Promise<any[]> {
  const savedRecommendations = [];

  for (const rec of recommendations) {
    // Save recommendation
    const { data: savedRec, error: recError } = await supabase
      .from("recommendations")
      .insert({
        ...rec.recommendation,
        session_id: sessionId,
        user_id: userId
      })
      .select()
      .single();

    if (recError) {
      console.error('Error saving recommendation:', recError);
      continue;
    }

    // Save explanation
    const { error: explanationError } = await supabase
      .from("recommendation_explanations")
      .insert({
        ...rec.explanation,
        recommendation_id: savedRec.id
      });

    if (explanationError) {
      console.error('Error saving explanation:', explanationError);
    }

    savedRecommendations.push({
      ...savedRec,
      explanation: rec.explanation,
      alternatives: rec.alternatives,
      confidence_factors: rec.confidence_factors
    });
  }

  return savedRecommendations;
}

/**
 * Calculate recommendation analytics
 */
function calculateRecommendationAnalytics(recommendations: any[]) {
  const total = recommendations.length;
  if (total === 0) {
    return {
      total_recommendations: 0,
      acceptance_rate: 0,
      effectiveness_score: 0,
      category_breakdown: {},
      average_confidence: 0
    };
  }

  const withFeedback = recommendations.filter(rec => rec.recommendation_feedback?.length > 0);
  const accepted = withFeedback.filter(rec => 
    rec.recommendation_feedback[0]?.user_action === 'accepted'
  );
  const withOutcomes = recommendations.filter(rec => rec.recommendation_outcomes?.length > 0);
  const successful = withOutcomes.filter(rec => 
    rec.recommendation_outcomes[0]?.user_satisfaction >= 7
  );

  const acceptanceRate = withFeedback.length > 0 ? (accepted.length / withFeedback.length) * 100 : 0;
  const effectivenessScore = withOutcomes.length > 0 ? (successful.length / withOutcomes.length) * 100 : 0;

  // Category breakdown
  const categoryBreakdown = recommendations.reduce((acc, rec) => {
    const category = rec.category;
    if (!acc[category]) {
      acc[category] = { count: 0, accepted: 0, effective: 0 };
    }
    acc[category].count++;
    
    if (rec.recommendation_feedback?.length > 0 && 
        rec.recommendation_feedback[0]?.user_action === 'accepted') {
      acc[category].accepted++;
    }
    
    if (rec.recommendation_outcomes?.length > 0 && 
        rec.recommendation_outcomes[0]?.user_satisfaction >= 7) {
      acc[category].effective++;
    }
    
    return acc;
  }, {});

  const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence_score, 0) / total;

  return {
    total_recommendations: total,
    acceptance_rate: acceptanceRate,
    effectiveness_score: effectivenessScore,
    category_breakdown: categoryBreakdown,
    average_confidence: avgConfidence * 100,
    feedback_rate: withFeedback.length / total * 100,
    outcome_tracking_rate: withOutcomes.length / total * 100
  };
}