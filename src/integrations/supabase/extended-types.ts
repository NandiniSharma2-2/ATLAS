// Extended types for new ATLAS features
import { Json } from './types'

// Health Memory Types
export interface HealthInsight {
  id: string
  user_id: string
  insight_type: 'trend' | 'pattern' | 'correlation' | 'anomaly'
  title: string
  description: string
  confidence_score: number
  data_points: Json
  start_date?: string
  end_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HealthCorrelation {
  id: string
  user_id: string
  factor_a: string
  factor_b: string
  correlation_strength: number
  sample_size: number
  p_value?: number
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  category: string
  target_frequency: number
  frequency_period: 'daily' | 'weekly' | 'monthly'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HabitCompletion {
  id: string
  habit_id: string
  user_id: string
  completed_date: string
  notes?: string
  created_at: string
}

// Future-Me Simulator Types
export interface FutureProjection {
  id: string
  user_id: string
  projection_type: '30_day' | '6_month' | '1_year'
  scenario_type: 'best_case' | 'realistic' | 'worst_case'
  generated_at: string
  input_data: Json
  health_score_projection: Json
  goal_achievement_probability?: number
  sleep_projection?: Json
  fitness_projection?: Json
  weight_projection?: Json
  mood_projection?: Json
  energy_projection?: Json
  risks?: Json
  opportunities?: Json
  habit_consistency_prediction?: Json
  behavior_change_likelihood?: Json
  recommended_actions?: Json
  confidence_score: number
  created_at: string
  expires_at: string
}

export interface UserGoal {
  id: string
  user_id: string
  title: string
  description?: string
  category: string
  target_value?: number
  target_unit?: string
  current_value?: number
  target_date?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  progress_percentage: number
  created_at: string
  updated_at: string
}

// Decision Intelligence Types
export interface DecisionSession {
  id: string
  user_id: string
  title: string
  description?: string
  context?: Json
  status: 'active' | 'completed' | 'cancelled'
  deadline?: string
  importance_level: number
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface DecisionOption {
  id: string
  session_id: string
  user_id: string
  title: string
  description?: string
  estimated_cost: number
  estimated_effort: number
  estimated_time_days: number
  risk_level: number
  potential_reward: number
  emotional_impact: number
  pros: Json
  cons: Json
  dependencies: Json
  reversibility: number
  confidence_rating?: number
  gut_feeling?: number
  created_at: string
  updated_at: string
}

// Life-Aware Planning Types
export interface UserSchedule {
  id: string
  user_id: string
  title: string
  description?: string
  schedule_type: string
  start_time?: string
  end_time?: string
  days_of_week?: number[]
  start_date?: string
  end_date?: string
  is_flexible: boolean
  priority_level: number
  can_reschedule: boolean
  buffer_minutes: number
  energy_required: number
  focus_required: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GeneratedPlan {
  id: string
  user_id: string
  plan_type: 'daily' | 'weekly' | 'monthly'
  target_date: string
  generated_at: string
  based_on_data_until?: string
  user_energy_pattern?: Json
  health_metrics?: Json
  existing_commitments?: Json
  goals_considered?: Json
  plan_structure: Json
  adaptations_made?: Json
  risk_factors?: Json
  backup_options?: Json
  estimated_success_probability?: number
  workload_balance_score?: number
  alignment_score?: number
  status: 'active' | 'completed' | 'abandoned' | 'superseded'
  created_at: string
}

// Recommendations Types
export interface RecommendationSession {
  id: string
  user_id: string
  session_name?: string
  trigger_context: string
  requested_categories?: Json
  analysis_date_range: Json
  user_data_analyzed: Json
  analysis_confidence: number
  created_at: string
}

export interface Recommendation {
  id: string
  session_id: string
  user_id: string
  title: string
  description: string
  category: string
  recommendation_type: string
  specific_action: string
  target_value?: number
  target_unit?: string
  frequency?: string
  confidence_score: number
  expected_impact_score: number
  effort_required: number
  time_to_see_results_days?: number
  priority_level: number
  urgency_level: number
  created_at: string
}

export interface RecommendationExplanation {
  id: string
  recommendation_id: string
  primary_reason: string
  supporting_reasons: Json
  data_patterns_used: Json
  correlations_found?: Json
  comparison_metrics?: Json
  trend_direction?: 'improving' | 'declining' | 'stable' | 'volatile'
  trend_confidence?: number
  trend_timeframe_days?: number
  risks_if_ignored?: Json
  risk_probability?: number
  potential_benefits?: Json
  synergy_with_other_recommendations?: Json
  created_at: string
}