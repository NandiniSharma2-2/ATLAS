-- Life-Aware Planning Schema
-- Tables for adaptive planning based on real-world conditions

-- User schedules and commitments
CREATE TABLE IF NOT EXISTS user_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  schedule_type VARCHAR(50) NOT NULL, -- work, study, personal, health, etc.
  
  -- Timing
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- [1,2,3,4,5] for Mon-Fri
  start_date DATE,
  end_date DATE,
  
  -- Flexibility
  is_flexible BOOLEAN DEFAULT FALSE,
  priority_level INTEGER CHECK (priority_level >= 1 AND priority_level <= 5) DEFAULT 3,
  can_reschedule BOOLEAN DEFAULT TRUE,
  buffer_minutes INTEGER DEFAULT 0,
  
  -- Energy requirements
  energy_required INTEGER CHECK (energy_required >= 1 AND energy_required <= 10) DEFAULT 5,
  focus_required INTEGER CHECK (focus_required >= 1 AND focus_required <= 10) DEFAULT 5,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated plans
CREATE TABLE IF NOT EXISTS generated_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  target_date DATE NOT NULL,
  
  -- Plan metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  based_on_data_until DATE, -- what date range of user data was used
  
  -- Input conditions used
  user_energy_pattern JSONB, -- historical energy levels by time/day
  health_metrics JSONB, -- recent health metrics that influenced the plan
  existing_commitments JSONB, -- schedules that couldn't be moved
  goals_considered JSONB, -- which goals were factored in
  
  -- Generated plan structure
  plan_structure JSONB NOT NULL, -- complete plan with tasks, times, priorities
  
  -- Adaptations made
  adaptations_made JSONB, -- what was changed from a "standard" plan
  risk_factors JSONB, -- potential issues with this plan
  backup_options JSONB, -- alternative arrangements if plan fails
  
  -- Plan metrics
  estimated_success_probability DECIMAL(3,2),
  workload_balance_score DECIMAL(3,2), -- how balanced the workload is
  alignment_score DECIMAL(3,2), -- how well it aligns with user patterns
  
  status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned, superseded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily plan tasks
CREATE TABLE IF NOT EXISTS plan_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES generated_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Task details
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- work, health, personal, etc.
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_start TIME,
  scheduled_end TIME,
  estimated_duration_minutes INTEGER,
  
  -- Requirements
  energy_requirement INTEGER CHECK (energy_requirement >= 1 AND energy_requirement <= 10),
  focus_requirement INTEGER CHECK (focus_requirement >= 1 AND focus_requirement <= 10),
  location_requirement VARCHAR(100),
  
  -- Priorities and flexibility
  priority_level INTEGER CHECK (priority_level >= 1 AND priority_level <= 5),
  is_moveable BOOLEAN DEFAULT TRUE,
  is_splittable BOOLEAN DEFAULT FALSE,
  dependencies JSONB DEFAULT '[]', -- other task IDs this depends on
  
  -- Completion tracking
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, skipped, rescheduled
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  -- Related to goals/habits
  related_goal_id UUID,
  related_habit_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plan adaptations and replanning history
CREATE TABLE IF NOT EXISTS plan_adaptations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_plan_id UUID REFERENCES generated_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Why was adaptation needed
  trigger_reason VARCHAR(100) NOT NULL, -- missed_tasks, energy_low, schedule_conflict, etc.
  trigger_data JSONB, -- details about what triggered the replan
  
  -- What changed
  changes_made JSONB NOT NULL, -- specific changes made to the plan
  tasks_moved JSONB, -- which tasks were rescheduled
  tasks_removed JSONB, -- which tasks were dropped
  tasks_added JSONB, -- new tasks added during replan
  
  -- Impact of changes
  impact_assessment JSONB, -- how changes affect goals, stress, etc.
  new_success_probability DECIMAL(3,2),
  
  adapted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Energy and availability patterns (learned from user behavior)
CREATE TABLE IF NOT EXISTS user_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Pattern identification
  pattern_type VARCHAR(50) NOT NULL, -- energy_by_hour, productivity_by_day, etc.
  pattern_name VARCHAR(100) NOT NULL,
  
  -- Pattern data
  pattern_data JSONB NOT NULL, -- the actual pattern (e.g., energy levels by hour)
  confidence_score DECIMAL(3,2) NOT NULL,
  sample_size INTEGER NOT NULL, -- how many data points this is based on
  
  -- Pattern metadata
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Pattern application
  how_to_use TEXT, -- guidance on how this pattern should influence planning
  
  UNIQUE(user_id, pattern_type, pattern_name)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_schedules_user_active ON user_schedules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_schedules_days ON user_schedules(user_id, days_of_week);
CREATE INDEX IF NOT EXISTS idx_generated_plans_user_type_date ON generated_plans(user_id, plan_type, target_date);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan_date ON plan_tasks(plan_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_user_date_status ON plan_tasks(user_id, scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_plan_adaptations_plan ON plan_adaptations(original_plan_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns_user_type ON user_patterns(user_id, pattern_type);

-- RLS Policies
ALTER TABLE user_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

-- Policies for user_schedules
CREATE POLICY "Users can manage own schedules" ON user_schedules
  FOR ALL USING (auth.uid() = user_id);

-- Policies for generated_plans
CREATE POLICY "Users can manage own plans" ON generated_plans
  FOR ALL USING (auth.uid() = user_id);

-- Policies for plan_tasks
CREATE POLICY "Users can manage own plan tasks" ON plan_tasks
  FOR ALL USING (auth.uid() = user_id);

-- Policies for plan_adaptations
CREATE POLICY "Users can view own plan adaptations" ON plan_adaptations
  FOR ALL USING (auth.uid() = user_id);

-- Policies for user_patterns
CREATE POLICY "Users can view own patterns" ON user_patterns
  FOR ALL USING (auth.uid() = user_id);