-- ============================================
-- Migrate Existing Scores to VP System
-- Conversion: 1 correct answer = 100 VP
-- ============================================

-- Step 1: Calculate VP for each user based on correct answers
-- and populate the user_levels table

INSERT INTO public.user_levels (user_id, total_vp, current_level, last_level_up_at)
SELECT 
    user_id,
    COUNT(*) * 100 AS total_vp,  -- 100 VP per correct answer
    -- Determine current level based on VP
    CASE 
        WHEN COUNT(*) * 100 >= 4000000 THEN 12  -- IBA Titan
        WHEN COUNT(*) * 100 >= 2000000 THEN 11  -- Record Breaker
        WHEN COUNT(*) * 100 >= 1000000 THEN 10  -- Olympian
        WHEN COUNT(*) * 100 >= 550000 THEN 9    -- Mach 1
        WHEN COUNT(*) * 100 >= 300000 THEN 8    -- Velocity Master
        WHEN COUNT(*) * 100 >= 150000 THEN 7    -- Sprinter
        WHEN COUNT(*) * 100 >= 75000 THEN 6     -- Hurdler
        WHEN COUNT(*) * 100 >= 35000 THEN 5     -- Strider
        WHEN COUNT(*) * 100 >= 15000 THEN 4     -- Pacer
        WHEN COUNT(*) * 100 >= 5000 THEN 3      -- Jogger
        WHEN COUNT(*) * 100 >= 1500 THEN 2      -- Stretcher
        ELSE 1                                   -- Rookie
    END AS current_level,
    now() AS last_level_up_at
FROM public.user_progress
WHERE is_correct = true
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
    total_vp = EXCLUDED.total_vp,
    current_level = EXCLUDED.current_level,
    updated_at = now();

-- Step 2: Create VP transaction records for historical correct answers
-- This creates a transaction record for each correct answer
INSERT INTO public.velocity_points (user_id, amount, reason, question_id, created_at)
SELECT 
    user_id,
    100 AS amount,  -- 100 VP per correct answer
    'correct_answer' AS reason,
    question_id,
    created_at
FROM public.user_progress
WHERE is_correct = true
ON CONFLICT DO NOTHING;

-- Step 3: Unlock badges for all achieved levels
INSERT INTO public.badge_achievements (user_id, level_id, unlocked_at)
SELECT DISTINCT
    ul.user_id,
    ld.id AS level_id,
    now() AS unlocked_at
FROM public.user_levels ul
CROSS JOIN public.level_definitions ld
WHERE ld.id <= ul.current_level  -- Unlock all levels up to current
ON CONFLICT (user_id, level_id) DO NOTHING;

-- Verification queries
-- Check total users migrated
SELECT COUNT(*) AS total_users_migrated FROM public.user_levels;

-- Check VP distribution
SELECT 
    current_level,
    ld.name AS level_name,
    COUNT(*) AS user_count,
    AVG(total_vp) AS avg_vp
FROM public.user_levels ul
JOIN public.level_definitions ld ON ld.id = ul.current_level
GROUP BY current_level, ld.name
ORDER BY current_level;

-- Check badge unlocks
SELECT 
    ld.name AS badge_name,
    COUNT(DISTINCT ba.user_id) AS users_unlocked
FROM public.badge_achievements ba
JOIN public.level_definitions ld ON ld.id = ba.level_id
GROUP BY ld.id, ld.name
ORDER BY ld.id;
