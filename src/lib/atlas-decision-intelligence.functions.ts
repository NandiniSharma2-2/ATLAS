// Decision Intelligence Backend Functions
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { DecisionEngine, type DecisionCriteria } from "./services/decision-engine";

// Validation schemas
const CreateDecisionSessionSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  context: z.record(z.any()).optional(),
  deadline: z.string().optional(),
  importance_level: z.number().min(1).max(5).default(3)
});

const AddDecisionOptionSchema = z.object({
  session_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  estimated_cost: z.number().min(0).default(0),
  estimated_effort: z.number().min(1).max(10).default(5),
  estimated_time_days: z.number().min(0).default(1),
  risk_level: z.number().min(1).max(10).default(5),
  potential_reward: z.number().min(1).max(10).default(5),
  emotional_impact: z.number().min(-5).max(5).default(0),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  reversibility: z.number().min(1).max(10).default(5),
  confidence_rating: z.number().min(1).max(10).optional(),
  gut_feeling: z.number().min(1).max(10).optional()
});

const AddDecisionCriteriaSchema = z.object({
  session_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  weight: z.number().min(0.1).max(10).default(1.0),
  description: z.string().optional()
});

const ScoreOptionSchema = z.object({
  option_id: z.string().uuid(),
  criteria_id: z.string().uuid(),
  score: z.number().min(1).max(10),
  notes: z.string().optional()
});

const AnalyzeDecisionSchema = z.object({
  session_id: z.string().uuid()
});

const CompareOptionsSchema = z.object({
  session_id: z.string().uuid(),
  option1_id: z.string().uuid(),
  option2_id: z.string().uuid()
});

// ==================== DECISION SESSION MANAGEMENT ====================

/**
 * Create a new decision session
 */
export const createDecisionSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(CreateDecisionSessionSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const { data: session, error } = await supabase
        .from("decision_sessions")
        .insert({
          ...data,
          user_id: userId,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return { session };
    } catch (error) {
      console.error('Error creating decision session:', error);
      throw new Error('Failed to create decision session');
    }
  });

/**
 * Add option to decision session
 */
export const addDecisionOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(AddDecisionOptionSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Verify session ownership
      const { data: session, error: sessionError } = await supabase
        .from("decision_sessions")
        .select("id")
        .eq("id", data.session_id)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        throw new Error('Decision session not found or access denied');
      }

      const { data: option, error } = await supabase
        .from("decision_options")
        .insert({
          ...data,
          user_id: userId,
          pros: data.pros,
          cons: data.cons,
          dependencies: data.dependencies
        })
        .select()
        .single();

      if (error) throw error;

      return { option };
    } catch (error) {
      console.error('Error adding decision option:', error);
      throw new Error('Failed to add decision option');
    }
  });

/**
 * Add criteria to decision session
 */
export const addDecisionCriteria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(AddDecisionCriteriaSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Verify session ownership
      const { data: session, error: sessionError } = await supabase
        .from("decision_sessions")
        .select("id")
        .eq("id", data.session_id)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        throw new Error('Decision session not found or access denied');
      }

      const { data: criteria, error } = await supabase
        .from("decision_criteria")
        .insert({
          ...data,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      return { criteria };
    } catch (error) {
      console.error('Error adding decision criteria:', error);
      throw new Error('Failed to add decision criteria');
    }
  });

/**
 * Score an option against a criteria
 */
export const scoreOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(ScoreOptionSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Verify option ownership through session
      const { data: option, error: optionError } = await supabase
        .from("decision_options")
        .select("session_id")
        .eq("id", data.option_id)
        .eq("user_id", userId)
        .single();

      if (optionError || !option) {
        throw new Error('Decision option not found or access denied');
      }

      // Verify criteria ownership
      const { data: criteria, error: criteriaError } = await supabase
        .from("decision_criteria")
        .select("session_id")
        .eq("id", data.criteria_id)
        .eq("user_id", userId)
        .single();

      if (criteriaError || !criteria) {
        throw new Error('Decision criteria not found or access denied');
      }

      // Ensure option and criteria belong to same session
      if (option.session_id !== criteria.session_id) {
        throw new Error('Option and criteria must belong to the same session');
      }

      // Upsert the score
      const { data: score, error } = await supabase
        .from("option_scores")
        .upsert({
          ...data
        }, {
          onConflict: 'option_id,criteria_id'
        })
        .select()
        .single();

      if (error) throw error;

      return { score };
    } catch (error) {
      console.error('Error scoring option:', error);
      throw new Error('Failed to score option');
    }
  });

// ==================== DECISION ANALYSIS ====================

/**
 * Analyze decision and generate recommendations
 */
export const analyzeDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(AnalyzeDecisionSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get session with all related data
      const sessionData = await this.getCompleteSessionData(supabase, userId, data.session_id);

      if (!sessionData.session) {
        throw new Error('Decision session not found or access denied');
      }

      if (sessionData.options.length === 0) {
        throw new Error('No options to analyze');
      }

      if (sessionData.criteria.length === 0) {
        throw new Error('No criteria defined for analysis');
      }

      // Build option scores map
      const optionScores: Record<string, Record<string, number>> = {};
      sessionData.options.forEach(option => {
        optionScores[option.id] = {};
        sessionData.criteria.forEach(criteria => {
          const score = sessionData.scores.find(s => 
            s.option_id === option.id && s.criteria_id === criteria.id
          );
          optionScores[option.id][criteria.id] = score?.score || 0;
        });
      });

      // Run analysis using DecisionEngine
      const analysis = DecisionEngine.analyzeDecision(
        sessionData.session,
        sessionData.options,
        sessionData.criteria,
        optionScores
      );

      // Save analysis to database
      const { data: savedAnalysis, error: analysisError } = await supabase
        .from("decision_analysis")
        .upsert({
          session_id: data.session_id,
          user_id: userId,
          ...analysis
        }, {
          onConflict: 'session_id,user_id'
        })
        .select()
        .single();

      if (analysisError) {
        console.error('Error saving analysis:', analysisError);
      }

      return {
        session: sessionData.session,
        analysis,
        options: sessionData.options,
        criteria: sessionData.criteria,
        scores: sessionData.scores
      };
    } catch (error) {
      console.error('Error analyzing decision:', error);
      throw new Error('Failed to analyze decision');
    }
  });

/**
 * Compare two specific options
 */
export const compareOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(CompareOptionsSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get session data
      const sessionData = await this.getCompleteSessionData(supabase, userId, data.session_id);

      if (!sessionData.session) {
        throw new Error('Decision session not found or access denied');
      }

      // Find the two options
      const option1 = sessionData.options.find(opt => opt.id === data.option1_id);
      const option2 = sessionData.options.find(opt => opt.id === data.option2_id);

      if (!option1 || !option2) {
        throw new Error('One or both options not found');
      }

      // Build scores map
      const scores: Record<string, Record<string, number>> = {};
      [option1, option2].forEach(option => {
        scores[option.id] = {};
        sessionData.criteria.forEach(criteria => {
          const score = sessionData.scores.find(s => 
            s.option_id === option.id && s.criteria_id === criteria.id
          );
          scores[option.id][criteria.id] = score?.score || 0;
        });
      });

      // Compare using DecisionEngine
      const comparison = DecisionEngine.compareOptions(
        option1,
        option2,
        sessionData.criteria,
        scores
      );

      return {
        option1,
        option2,
        comparison,
        criteria: sessionData.criteria
      };
    } catch (error) {
      console.error('Error comparing options:', error);
      throw new Error('Failed to compare options');
    }
  });

/**
 * Get suggested criteria for a decision
 */
export const getSuggestedCriteria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    session_id: z.string().uuid()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      // Get session and options
      const { data: session, error: sessionError } = await supabase
        .from("decision_sessions")
        .select("*")
        .eq("id", data.session_id)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        throw new Error('Decision session not found or access denied');
      }

      const { data: options, error: optionsError } = await supabase
        .from("decision_options")
        .select("*")
        .eq("session_id", data.session_id)
        .eq("user_id", userId);

      if (optionsError) throw optionsError;

      // Generate suggestions using DecisionEngine
      const suggestions = DecisionEngine.suggestCriteria(session, options || []);

      return {
        session,
        suggested_criteria: suggestions,
        options_analyzed: options?.length || 0
      };
    } catch (error) {
      console.error('Error getting suggested criteria:', error);
      throw new Error('Failed to get suggested criteria');
    }
  });

// ==================== SESSION MANAGEMENT ====================

/**
 * Get decision session with all related data
 */
export const getDecisionSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    session_id: z.string().uuid(),
    include_analysis: z.boolean().default(true)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const sessionData = await this.getCompleteSessionData(supabase, userId, data.session_id);

      if (!sessionData.session) {
        throw new Error('Decision session not found or access denied');
      }

      let analysis = null;
      if (data.include_analysis) {
        const { data: analysisData, error: analysisError } = await supabase
          .from("decision_analysis")
          .select("*")
          .eq("session_id", data.session_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (analysisError) {
          console.error('Error fetching analysis:', analysisError);
        } else {
          analysis = analysisData;
        }
      }

      return {
        ...sessionData,
        analysis
      };
    } catch (error) {
      console.error('Error getting decision session:', error);
      throw new Error('Failed to get decision session');
    }
  });

/**
 * Get all user decision sessions
 */
export const getUserDecisionSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
    limit: z.number().min(1).max(100).default(20),
    include_summary: z.boolean().default(true)
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      let query = supabase
        .from("decision_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(data.limit);

      if (data.status) {
        query = query.eq("status", data.status);
      }

      const { data: sessions, error } = await query;

      if (error) throw error;

      if (!data.include_summary) {
        return { sessions: sessions || [] };
      }

      // Get summary data for each session
      const sessionsWithSummary = await Promise.all(
        (sessions || []).map(async session => {
          const [optionsResult, criteriaResult, analysisResult] = await Promise.all([
            supabase
              .from("decision_options")
              .select("id")
              .eq("session_id", session.id)
              .eq("user_id", userId),
            supabase
              .from("decision_criteria")
              .select("id")
              .eq("session_id", session.id)
              .eq("user_id", userId),
            supabase
              .from("decision_analysis")
              .select("recommended_option, confidence_score")
              .eq("session_id", session.id)
              .eq("user_id", userId)
              .maybeSingle()
          ]);

          return {
            ...session,
            summary: {
              options_count: optionsResult.data?.length || 0,
              criteria_count: criteriaResult.data?.length || 0,
              has_analysis: !!analysisResult.data,
              recommended_option: analysisResult.data?.recommended_option,
              confidence_score: analysisResult.data?.confidence_score
            }
          };
        })
      );

      return { sessions: sessionsWithSummary };
    } catch (error) {
      console.error('Error fetching decision sessions:', error);
      throw new Error('Failed to fetch decision sessions');
    }
  });

/**
 * Update decision session
 */
export const updateDecisionSession = createServerFn({ method: "PUT" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    session_id: z.string().uuid(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().optional(),
    context: z.record(z.any()).optional(),
    deadline: z.string().optional(),
    importance_level: z.number().min(1).max(5).optional(),
    status: z.enum(['active', 'completed', 'cancelled']).optional()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { session_id, ...updates } = data;

    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: session, error } = await supabase
        .from("decision_sessions")
        .update(updateData)
        .eq("id", session_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return { session };
    } catch (error) {
      console.error('Error updating decision session:', error);
      throw new Error('Failed to update decision session');
    }
  });

/**
 * Delete decision session and all related data
 */
export const deleteDecisionSession = createServerFn({ method: "DELETE" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    session_id: z.string().uuid()
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    try {
      const { error } = await supabase
        .from("decision_sessions")
        .delete()
        .eq("id", data.session_id)
        .eq("user_id", userId);

      if (error) throw error;

      return { success: true, deleted_session_id: data.session_id };
    } catch (error) {
      console.error('Error deleting decision session:', error);
      throw new Error('Failed to delete decision session');
    }
  });

// ==================== HELPER METHODS ====================

/**
 * Get complete session data including options, criteria, and scores
 */
async function getCompleteSessionData(supabase: any, userId: string, sessionId: string) {
  const [sessionResult, optionsResult, criteriaResult, scoresResult] = await Promise.all([
    supabase
      .from("decision_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("decision_options")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("decision_criteria")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("option_scores")
      .select("*")
      .in("option_id", 
        supabase
          .from("decision_options")
          .select("id")
          .eq("session_id", sessionId)
          .eq("user_id", userId)
      )
  ]);

  return {
    session: sessionResult.data,
    options: optionsResult.data || [],
    criteria: criteriaResult.data || [],
    scores: scoresResult.data || []
  };
}