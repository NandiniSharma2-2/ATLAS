-- Health Memory Enhanced Schema
-- Extending existing daily_logs and adding new tables for comprehensive health tracking

-- Add missing columns to daily_logs
ALTER TABLE daily_logs 
ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
ADD COLUMN IF NOT EXISTS stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
ADD COLUMN IF NOT EXISTS exercise_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS habits JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Health insights and patterns
CREATE TABLE IF NOT EXISTS health_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type VARCHAR(50) NOT NULL, -- 'trend', 'pattern', 'correlation', 'anomaly'
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_points JSONB NOT NULL, -- supporting evidence
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health correlations (what affects what)
CREATE TABLE IF NOT EXISTS health_correlations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  factor_a VARCHAR(50) NOT NULL, -- sleep_hours, steps, etc.
  factor_b VARCHAR(50) NOT NULL,
  correlation_strength DECIMAL(4,3) CHECK (correlation_strength >= -1 AND correlation_strength <= 1),
  sample_size INTEGER NOT NULL,
  p_value DECIMAL(10,8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, factor_a, factor_b)
);

-- Habit tracking
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- health, productivity, wellness, etc.
  target_frequency INTEGER DEFAULT 1, -- times per day/week
  frequency_period VARCHAR(10) DEFAULT 'daily', -- daily, weekly, monthly
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habit completions
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, completed_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_insights_user_type ON health_insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_health_insights_active ON health_insights(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_health_correlations_user ON health_correlations(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON habit_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);

-- RLS Policies
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Policies for health_insights
CREATE POLICY "Users can view own health insights" ON health_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health insights" ON health_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own health insights" ON health_insights
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for health_correlations
CREATE POLICY "Users can view own health correlations" ON health_correlations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health correlations" ON health_correlations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own health correlations" ON health_correlations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for habits
CREATE POLICY "Users can view own habits" ON habits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON habits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for habit_completions
CREATE POLICY "Users can view own habit completions" ON habit_completions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit completions" ON habit_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit completions" ON habit_completions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit completions" ON habit_completions
  FOR DELETE USING (auth.uid() = user_id);