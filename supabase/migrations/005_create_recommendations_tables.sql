-- Explainable Recommendations Schema
-- Tables for generating and tracking recommendations with full explanations

-- Recommendation sessions
CREATE TABLE IF NOT EXISTS recommendation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Session metadata
  session_name VARCHAR(200),
  trigger_context VARCHAR(100) NOT NULL, -- daily_check, goal_review, health_analysis, etc.
  requested_categories JSONB, -- which types of recommendations were requested
  
  -- Analysis context
  analysis_date_range JSONB NOT NULL, -- {start_date, end_date} of data analyzed
  user_data_analyzed JSONB NOT NULL, -- summary of what data was used
  analysis_confidence DECIMAL(3,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES recommendation_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Recommendation details
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- sleep, exercise, nutrition, habits, etc.
  recommendation_type VARCHAR(50) NOT NULL, -- increase, decrease, start, stop, adjust, etc.
  
  -- Specificity
  specific_action TEXT NOT NULL, -- exact action to take
  target_value DECIMAL(10,2), -- specific target if applicable
  target_unit VARCHAR(20),
  frequency VARCHAR(50), -- daily, 3x per week, etc.
  
  -- Confidence and impact
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  expected_impact_score DECIMAL(3,2) NOT NULL CHECK (expected_impact_score >= 0 AND expected_impact_score <= 1),
  effort_required INTEGER CHECK (effort_required >= 1 AND effort_required <= 10),
  time_to_see_results_days INTEGER,
  
  -- Priority and urgency
  priority_level INTEGER CHECK (priority_level >= 1 AND priority_level <= 5) DEFAULT 3,
  urgency_level INTEGER CHECK (urgency_level >= 1 AND urgency_level <= 5) DEFAULT 3,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendation explanations (the "why" behind each recommendation)
CREATE TABLE IF NOT EXISTS recommendation_explanations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE NOT NULL,
  
  -- Core reasoning
  primary_reason TEXT NOT NULL, -- main reason for this recommendation
  supporting_reasons JSONB NOT NULL, -- additional supporting factors
  
  -- Evidence used
  data_patterns_used JSONB NOT NULL, -- what patterns in user data led to this
  correlations_found JSONB, -- relevant correlations discovered
  comparison_metrics JSONB, -- how user compares to benchmarks/norms
  
  -- Trend analysis
  trend_direction VARCHAR(20), -- improving, declining, stable, volatile
  trend_confidence DECIMAL(3,2),
  trend_timeframe_days INTEGER,
  
  -- Risk assessment
  risks_if_ignored JSONB, -- what could happen if user doesn't follow this
  risk_probability DECIMAL(3,2),
  
  -- Opportunities
  potential_benefits JSONB, -- specific benefits if followed
  synergy_with_other_recommendations JSONB, -- how this works with other recs
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alternative recommendations (other options considered)
CREATE TABLE IF NOT EXISTS recommendation_alternatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE NOT NULL,
  
  -- Alternative details
  alternative_title VARCHAR(300) NOT NULL,
  alternative_description TEXT NOT NULL,
  alternative_action TEXT NOT NULL,
  
  -- Why not recommended as primary
  why_not_primary TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  expected_impact_score DECIMAL(3,2) NOT NULL,
  effort_required INTEGER CHECK (effort_required >= 1 AND effort_required <= 10),
  
  -- When this might be better
  better_if_conditions JSONB, -- conditions under which this might be preferred
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feedback on recommendations
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- User actions
  user_action VARCHAR(50) NOT NULL, -- accepted, rejected, modified, ignored
  action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- If modified, what changed
  modified_action TEXT,
  modified_target_value DECIMAL(10,2),
  modification_reason TEXT,
  
  -- User ratings
  usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 10),
  clarity_rating INTEGER CHECK (clarity_rating >= 1 AND clarity_rating <= 10),
  feasibility_rating INTEGER CHECK (feasibility_rating >= 1 AND feasibility_rating <= 10),
  
  -- User feedback
  feedback_text TEXT,
  would_want_similar BOOLEAN,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendation outcomes tracking
CREATE TABLE IF NOT EXISTS recommendation_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Implementation tracking
  started_following_date DATE,
  stopped_following_date DATE,
  adherence_percentage DECIMAL(5,2), -- how well user followed it (0-100%)
  
  -- Measured results
  baseline_value DECIMAL(10,2), -- value before recommendation
  current_value DECIMAL(10,2), -- current value
  target_achieved BOOLEAN DEFAULT FALSE,
  time_to_see_impact_days INTEGER,
  
  -- Impact assessment
  actual_impact_score DECIMAL(3,2), -- actual vs expected impact
  side_effects JSONB, -- unexpected positive/negative effects
  user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 10),
  
  -- Learning
  lessons_learned TEXT,
  would_recommend_to_others BOOLEAN,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_user ON recommendation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_session ON recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_category ON recommendations(user_id, category);
CREATE INDEX IF NOT EXISTS idx_recommendation_explanations_rec ON recommendation_explanations(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_alternatives_primary ON recommendation_alternatives(primary_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_rec ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_rec ON recommendation_outcomes(recommendation_id);

-- RLS Policies
ALTER TABLE recommendation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;

-- Policies for recommendation_sessions
CREATE POLICY "Users can manage own recommendation sessions" ON recommendation_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for recommendations
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR ALL USING (auth.uid() = user_id);

-- Policies for recommendation_explanations
CREATE POLICY "Users can view own recommendation explanations" ON recommendation_explanations
  FOR ALL USING (recommendation_id IN (SELECT id FROM recommendations WHERE user_id = auth.uid()));

-- Policies for recommendation_alternatives
CREATE POLICY "Users can view own recommendation alternatives" ON recommendation_alternatives
  FOR ALL USING (primary_recommendation_id IN (SELECT id FROM recommendations WHERE user_id = auth.uid()));

-- Policies for recommendation_feedback
CREATE POLICY "Users can manage own recommendation feedback" ON recommendation_feedback
  FOR ALL USING (auth.uid() = user_id);

-- Policies for recommendation_outcomes
CREATE POLICY "Users can manage own recommendation outcomes" ON recommendation_outcomes
  FOR ALL USING (auth.uid() = user_id);