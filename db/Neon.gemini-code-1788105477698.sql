-- 1. Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Core Users Table (Passwordless Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  time_zone VARCHAR(50) DEFAULT 'UTC',
  time_format VARCHAR(10) DEFAULT '24h',  -- '12h' or '24h'
  weight_unit VARCHAR(5) DEFAULT 'kg',    -- 'kg' or 'lb'
  theme VARCHAR(10) DEFAULT 'system',     -- 'light', 'dark', 'system'
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 3. OTP Authentication Table
CREATE TABLE auth_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(64) NOT NULL, -- SHA-256 blind hash
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_otps_email ON auth_otps(email);

-- 4. Fasting Plans
CREATE TABLE fasting_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,              -- '16:8', '18:6', '20:4', 'OMAD', 'Custom'
  fast_start_time TIME NOT NULL,          
  fast_end_time TIME NOT NULL,            
  target_duration_hours NUMERIC(5, 2),    
  is_default BOOLEAN DEFAULT false,
  is_daily BOOLEAN DEFAULT true,          
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fasting_plans_user_id ON fasting_plans(user_id);

-- 5. Weekly Fasting Plan Schedules
CREATE TABLE fasting_plan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,           -- 0 (Sunday) to 6 (Saturday)
  fasting_plan_id UUID REFERENCES fasting_plans(id) ON DELETE SET NULL,
  fast_start_time TIME NOT NULL,
  fast_end_time TIME NOT NULL,
  target_duration_hours NUMERIC(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, day_of_week)
);

CREATE INDEX idx_fasting_schedules_user_id ON fasting_plan_schedules(user_id);

-- 6. Fasting Sessions (Core Event Table)
CREATE TABLE fasting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,             
  last_meal_time TIMESTAMP NOT NULL,      
  fast_start_time TIMESTAMP NOT NULL,     
  planned_fast_end_time TIMESTAMP NOT NULL,  
  actual_fast_end_time TIMESTAMP,         
  target_duration_hours NUMERIC(5, 2),    
  actual_duration_hours NUMERIC(5, 2),    
  status VARCHAR(20) DEFAULT 'active',    -- 'planned', 'active', 'completed', 'broken'
  is_goal_met BOOLEAN DEFAULT false,      
  notes TEXT,                             
  was_edited BOOLEAN DEFAULT false,       
  edit_reason TEXT,                       
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON fasting_sessions(user_id);
CREATE INDEX idx_sessions_date ON fasting_sessions(session_date);
CREATE INDEX idx_sessions_user_date ON fasting_sessions(user_id, session_date);
CREATE INDEX idx_sessions_status ON fasting_sessions(status);

-- 7. Meals within Sessions
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fasting_session_id UUID NOT NULL REFERENCES fasting_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_time TIMESTAMP NOT NULL,           
  meal_type VARCHAR(20),                  
  meal_size VARCHAR(20),                  
  calories INTEGER,
  protein_g NUMERIC(5, 1),
  carbs_g NUMERIC(5, 1),
  fat_g NUMERIC(5, 1),
  description TEXT,                       
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meals_session_id ON meals(fasting_session_id);
CREATE INDEX idx_meals_user_id ON meals(user_id);

-- 8. User Fasting Rules
CREATE TABLE fasting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  min_duration_to_count_hours NUMERIC(5, 2) DEFAULT 12.00,  
  snack_behavior VARCHAR(30) DEFAULT 'ask_each_time',       
  allow_edit_past_meals BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_fasting_rules_user_id ON fasting_rules(user_id);

-- 9. Notification Settings
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  remind_before_eating_window_end BOOLEAN DEFAULT true,
  remind_before_minutes INTEGER DEFAULT 30,
  remind_to_start_fast BOOLEAN DEFAULT false,
  notify_when_target_reached BOOLEAN DEFAULT true,
  light_checkins_enabled BOOLEAN DEFAULT false,
  light_checkin_frequency_hours INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_notifications_user_id ON notification_settings(user_id);

-- 10. User Wellness Tags
CREATE TABLE user_wellness_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fasting_session_id UUID NOT NULL REFERENCES fasting_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  energy_level VARCHAR(20),       
  mood VARCHAR(20),               
  hunger_level VARCHAR(20),       
  custom_tags TEXT,               
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wellness_session_id ON user_wellness_tags(fasting_session_id);
CREATE INDEX idx_wellness_user_id ON user_wellness_tags(user_id);

-- 11. Pre-computed Analytics Cache
CREATE TABLE user_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL,       
  total_fasts_count INTEGER DEFAULT 0,
  fasts_completed_count INTEGER DEFAULT 0,
  average_duration_hours NUMERIC(5, 2),
  longest_duration_hours NUMERIC(5, 2),
  current_streak_days INTEGER DEFAULT 0,
  goal_met_percentage NUMERIC(5, 2),
  most_common_last_meal_hour INTEGER,     
  most_common_break_fast_hour INTEGER,    
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, period_start_date, period_end_date, period_type)
);

CREATE INDEX idx_analytics_user_id ON user_analytics_cache(user_id);
CREATE INDEX idx_analytics_period ON user_analytics_cache(user_id, period_type, period_end_date);

-- 12. Audit Triggers for automatic updated_at tracking
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_fasting_plans_timestamp BEFORE UPDATE ON fasting_plans
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_fasting_sessions_timestamp BEFORE UPDATE ON fasting_sessions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_meals_timestamp BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 13. System Views
CREATE VIEW current_fasting_sessions AS
SELECT 
  fs.id,
  fs.user_id,
  fs.session_date,
  fs.last_meal_time,
  fs.fast_start_time,
  fs.planned_fast_end_time,
  fs.actual_fast_end_time,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - fs.fast_start_time)) / 3600 AS elapsed_hours,
  fs.target_duration_hours,
  fs.status,
  fs.is_goal_met
FROM fasting_sessions fs
WHERE fs.status IN ('active', 'planned');

CREATE VIEW monthly_fasting_stats AS
SELECT
  user_id,
  DATE_TRUNC('month', session_date)::DATE AS month,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE is_goal_met) AS completed_sessions,
  AVG(actual_duration_hours) AS avg_duration,
  MAX(actual_duration_hours) AS longest_duration,
  MIN(session_date) AS first_session_date,
  MAX(session_date) AS last_session_date
FROM fasting_sessions
WHERE status = 'completed'
GROUP BY user_id, DATE_TRUNC('month', session_date);