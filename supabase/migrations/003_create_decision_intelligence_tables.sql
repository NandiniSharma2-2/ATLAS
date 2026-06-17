-- Decision Intelligence Schema
-- Tables for decision analysis, scoring, and tracking

-- Decision sessions
CREATE TABLE IF NOT EXISTS decision_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  context JSONB, -- additional context about the decision
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  deadline DATE,
  importance_level INTEGER CHECK (importance_level >= 1 AND importance_level <= 5) DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Decision options
CREATE TABLE IF NOT EXISTS decision_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES decision_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Core metrics
  estimated_cost DECIMAL(12,2) DEFAULT 0,
  estimated_effort INTEGER DEFAULT 1, -- 1-10 scale
  estimated_time_days INTEGER DEFAULT 1,
  risk_level INTEGER CHECK (risk_level >= 1 AND risk_level <= 10) DEFAULT 5,
  potential_reward INTEGER CHECK (potential_reward >= 1 AND potential_reward <= 10) DEFAULT 5,
  emotional_impact INTEGER CHECK (emotional_impact >= -5 AND emotional_impact <= 5) DEFAULT 0,
  
  -- Additional factors
  pros JSONB DEFAULT '[]', -- array of pros
  cons JSONB DEFAULT '[]', -- array of cons
  dependencies JSONB DEFAULT '[]', -- what this depends on
  reversibility INTEGER CHECK (reversibility >= 1 AND reversibility <= 10) DEFAULT 5,
  
  -- User ratings
  confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 10),
  gut_feeling INTEGER CHECK (gut_feeling >= 1 AND gut_feeling <= 10),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decision criteria (what matters for this decision)
CREATE TABLE IF NOT EXISTS decision_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES decision_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0, -- importance multiplier
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Option scores against criteria
CREATE TABLE IF NOT EXISTS option_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID REFERENCES decision_options(id) ON DELETE CASCADE NOT NULL,
  criteria_id UUID REFERENCES decision_criteria(id) ON DELETE CASCADE NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 10) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(option_id, criteria_id)
);

-- Final decision analysis results
CREATE TABLE IF NOT EXISTS decision_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES decision_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Rankings
  ranked_options JSONB NOT NULL, -- ordered array of options with scores
  
  -- Analysis results
  recommended_option UUID REFERENCES decision_options(id),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1),
  opportunity_score DECIMAL(3,2) CHECK (opportunity_score >= 0 AND opportunity_score <= 1),
  
  -- Reasoning
  reasoning JSONB NOT NULL, -- detailed breakdown of why this recommendation
  key_factors JSONB, -- most important factors in this decision
  warnings JSONB, -- potential red flags
  alternatives JSONB, -- alternative recommendations
  
  -- Sensitivity analysis
  sensitivity_analysis JSONB, -- how changes in criteria weights affect ranking
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decision outcomes tracking (post-decision)
CREATE TABLE IF NOT EXISTS decision_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES decision_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chosen_option_id UUID REFERENCES decision_options(id),
  
  -- Actual vs predicted
  actual_cost DECIMAL(12,2),
  actual_effort INTEGER,
  actual_time_days INTEGER,
  actual_risk_impact INTEGER,
  actual_reward INTEGER,
  
  -- Satisfaction
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 10),
  would_choose_again BOOLEAN,
  lessons_learned TEXT,
  
  -- Follow-up
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_decision_sessions_user_status ON decision_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_decision_options_session ON decision_options(session_id);
CREATE INDEX IF NOT EXISTS idx_decision_criteria_session ON decision_criteria(session_id);
CREATE INDEX IF NOT EXISTS idx_option_scores_option ON option_scores(option_id);
CREATE INDEX IF NOT EXISTS idx_option_scores_criteria ON option_scores(criteria_id);
CREATE INDEX IF NOT EXISTS idx_decision_analysis_session ON decision_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_session ON decision_outcomes(session_id);

-- RLS Policies
ALTER TABLE decision_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;

-- Policies for decision_sessions
CREATE POLICY "Users can manage own decision sessions" ON decision_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for decision_options
CREATE POLICY "Users can manage own decision options" ON decision_options
  FOR ALL USING (auth.uid() = user_id);

-- Policies for decision_criteria
CREATE POLICY "Users can manage own decision criteria" ON decision_criteria
  FOR ALL USING (auth.uid() = user_id);

-- Policies for option_scores
CREATE POLICY "Users can manage own option scores" ON option_scores
  FOR ALL USING (option_id IN (SELECT id FROM decision_options WHERE user_id = auth.uid()));

-- Policies for decision_analysis
CREATE POLICY "Users can manage own decision analysis" ON decision_analysis
  FOR ALL USING (auth.uid() = user_id);

-- Policies for decision_outcomes
CREATE POLICY "Users can manage own decision outcomes" ON decision_outcomes
  FOR ALL USING (auth.uid() = user_id);