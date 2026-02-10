-- Update velocity_points_reason_check constraint to include all used reasons
ALTER TABLE public.velocity_points 
DROP CONSTRAINT IF EXISTS velocity_points_reason_check;

ALTER TABLE public.velocity_points 
ADD CONSTRAINT velocity_points_reason_check 
CHECK (reason = ANY (ARRAY[
  'correct_answer', 
  'wrong_answer', 
  'module_complete', 
  'session_complete', 
  'perfect_score', 
  'high_score', 
  'speed_bonus', 
  'exam_complete', 
  'login_streak', 
  'practice_streak', 
  'streak_multiplier', 
  'daily_streak', 
  'bonus', 
  'manual_adjustment'
]::text[]));
