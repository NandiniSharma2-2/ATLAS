-- Future-Me Simulator Schema
-- Tables for predictions, scenarios, and projections

-- Future predictions/projections
CREATE TABLE IF NOT EXISTS future_projections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  projection_type VARCHAR(20) NOT NULL, -- '30_day', '6_month', '1_year'
  scenario_type VARCHAR(20) NOT NULL, -- 'best_case', 'realistic', 'worst_case'
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Input parameters
  input_data JSONB NOT NULL,
  
  -- Predictions
  health_score_projection JSONB NOT NULL, -- {current: 75, predicted: 85, confidence: 0.8}
  goal_achievement_probability DECIMAL(3,2), -- 0-1
  
  -- Specific predictions by category
  sleep_projection JSONB,
  fitness_projection JSONB,
  weight_projection JSONB,
  mood_projection JSONB,
  energy_projection JSONB,
  
  -- Risk factors and opportunities
  risks JSONB, -- [{"risk": "burnout", "probability": 0.3, "impact": "high"}]
  opportunities JSONB, -- [{"opportunity": "consistency", "potential": 0.7}]
  
  -- Behavioral predictions
  habit_consistency_prediction JSONB,
  behavior_change_likelihood JSONB,
  
  -- Recommendations based on projections
  recommended_actions JSONB,
  
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- Goals tracking for projections
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- health, fitness, sleep, nutrition, etc.
  target_value DECIMAL(10,2),
  target_unit VARCHAR(20), -- kg, hours, steps, etc.
  current_value DECIMAL(10,2),
  target_date DATE,
  priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, critical
  status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, cancelled
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal milestones
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  target_date DATE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  is_achieved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation sessions (when user requests specific projections)
CREATE TABLE IF NOT EXISTS simulation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_name VARCHAR(200),
  parameters JSONB NOT NULL, -- input parameters for the simulation
  results JSONB NOT NULL, -- complete simulation results
  comparison_baseline JSONB, -- baseline scenario for comparison
  insights JSONB, -- key insights from the simulation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prediction accuracy tracking (to improve models)
CREATE TABLE IF NOT EXISTS prediction_accuracy (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projection_id UUID REFERENCES future_projections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actual_value DECIMAL(10,2),
  predicted_value DECIMAL(10,2),
  metric_name VARCHAR(50) NOT NULL,
  evaluation_date DATE NOT NULL,
  accuracy_score DECIMAL(4,3), -- how accurate was the prediction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_future_projections_user_type ON future_projections(user_id, projection_type, scenario_type);
CREATE INDEX IF NOT EXISTS idx_future_projections_expires ON future_projections(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_status ON user_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_goals_category ON user_goals(user_id, category);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_user ON simulation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_projection ON prediction_accuracy(projection_id);

-- RLS Policies
ALTER TABLE future_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_accuracy ENABLE ROW LEVEL SECURITY;

-- Policies for future_projections
CREATE POLICY "Users can view own future projections" ON future_projections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own future projections" ON future_projections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own future projections" ON future_projections
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for user_goals
CREATE POLICY "Users can manage own goals" ON user_goals
  FOR ALL USING (auth.uid() = user_id);

-- Policies for goal_milestones
CREATE POLICY "Users can manage own goal milestones" ON goal_milestones
  FOR ALL USING (goal_id IN (SELECT id FROM user_goals WHERE user_id = auth.uid()));

-- Policies for simulation_sessions
CREATE POLICY "Users can manage own simulation sessions" ON simulation_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for prediction_accuracy
CREATE POLICY "Users can view own prediction accuracy" ON prediction_accuracy
  FOR ALL USING (auth.uid() = user_id);