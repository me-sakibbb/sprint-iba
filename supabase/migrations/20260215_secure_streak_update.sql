-- Create function to securely process login streak
CREATE OR REPLACE FUNCTION process_login_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (likely admin/postgres)
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_login_bonus int;
    v_streak_record record;
    v_today date;
    v_yesterday date;
    v_new_streak int;
    v_new_longest int;
    v_vp_awarded int;
    v_base_points int;
    v_bonus_points int;
    v_multiplier numeric;
    v_multipliers jsonb;
    v_next_milestone int;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_today := current_date;
    v_yesterday := v_today - 1;

    -- 1. Get configuration
    -- Default value 50 if not found
    SELECT COALESCE((config_value::text)::int, 50) INTO v_login_bonus
    FROM point_configuration
    WHERE config_key = 'login_streak_daily';

    IF v_login_bonus IS NULL THEN
        v_login_bonus := 50;
    END IF;

    -- Get streak multipliers configuration
    SELECT COALESCE(config_value, '{"7": 1.5, "14": 2.0, "30": 2.5}'::jsonb) INTO v_multipliers
    FROM point_configuration
    WHERE config_key = 'streak_multipliers';

    -- 2. Get or create user streak
    SELECT * INTO v_streak_record FROM user_streaks WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_streaks (user_id, login_streak_count, login_streak_last_date, longest_login_streak)
        VALUES (v_user_id, 1, v_today, 1)
        RETURNING * INTO v_streak_record;
        v_new_streak := 1;
        v_new_longest := 1;
        v_base_points := v_login_bonus;
        v_multiplier := 1.0;
        v_bonus_points := 0;
        v_vp_awarded := v_login_bonus;
    ELSE
        -- Check if already logged in today
        IF v_streak_record.login_streak_last_date = v_today THEN
            RETURN jsonb_build_object(
                'streakCount', v_streak_record.login_streak_count,
                'vpAwarded', 0,
                'leveledUp', false,
                'multiplier', 1.0,
                'basePoints', 0,
                'bonusPoints', 0,
                'nextMilestone', NULL
            );
        END IF;

        -- Check consecutive day
        IF v_streak_record.login_streak_last_date = v_yesterday THEN
            v_new_streak := v_streak_record.login_streak_count + 1;
        ELSE
            v_new_streak := 1;
        END IF;

        v_new_longest := GREATEST(v_new_streak, v_streak_record.longest_login_streak);
        
        -- Calculate streak multiplier
        v_base_points := v_login_bonus;
        v_multiplier := 1.0;
        v_bonus_points := 0;
        
        -- Check for multiplier milestones (30, 14, 7 - check highest first)
        IF v_new_streak >= 30 AND v_multipliers ? '30' THEN
            v_multiplier := (v_multipliers->>'30')::numeric;
        ELSIF v_new_streak >= 14 AND v_multipliers ? '14' THEN
            v_multiplier := (v_multipliers->>'14')::numeric;
        ELSIF v_new_streak >= 7 AND v_multipliers ? '7' THEN
            v_multiplier := (v_multipliers->>'7')::numeric;
        END IF;
        
        -- Apply multiplier
        IF v_multiplier > 1.0 THEN
            v_bonus_points := FLOOR(v_base_points * (v_multiplier - 1.0));
            v_vp_awarded := v_base_points + v_bonus_points;
        ELSE
            v_vp_awarded := v_base_points;
        END IF;

        -- Update streak
        UPDATE user_streaks
        SET login_streak_count = v_new_streak,
            login_streak_last_date = v_today,
            longest_login_streak = v_new_longest,
            updated_at = now()
        WHERE id = v_streak_record.id;
    END IF;

    -- 3. Calculate next milestone
    IF v_new_streak < 7 THEN
        v_next_milestone := 7;
    ELSIF v_new_streak < 14 THEN
        v_next_milestone := 14;
    ELSIF v_new_streak < 30 THEN
        v_next_milestone := 30;
    ELSE
        v_next_milestone := NULL;
    END IF;

    -- 4. Award points
    IF v_vp_awarded > 0 THEN
        -- Record base points
        INSERT INTO velocity_points (user_id, amount, reason, metadata)
        VALUES (
            v_user_id,
            v_base_points,
            'login_streak',
            jsonb_build_object(
                'streak_count', v_new_streak, 
                'date', v_today,
                'multiplier', v_multiplier
            )
        );
        
        -- Record bonus points separately if applicable
        IF v_bonus_points > 0 THEN
            INSERT INTO velocity_points (user_id, amount, reason, metadata)
            VALUES (
                v_user_id,
                v_bonus_points,
                'streak_multiplier',
                jsonb_build_object(
                    'streak_count', v_new_streak,
                    'multiplier', v_multiplier,
                    'base_reason', 'login_streak',
                    'date', v_today
                )
            );
        END IF;

        -- Update user_levels total_vp
        INSERT INTO user_levels (user_id, total_vp)
        VALUES (v_user_id, v_vp_awarded)
        ON CONFLICT (user_id)
        DO UPDATE SET
            total_vp = user_levels.total_vp + EXCLUDED.total_vp,
            updated_at = now();
    END IF;

    RETURN jsonb_build_object(
        'streakCount', v_new_streak,
        'vpAwarded', v_vp_awarded,
        'leveledUp', false,
        'multiplier', v_multiplier,
        'basePoints', v_base_points,
        'bonusPoints', v_bonus_points,
        'nextMilestone', v_next_milestone
    );
END;
$$;

-- Create function to securely process practice streak
CREATE OR REPLACE FUNCTION process_practice_streak(p_questions_answered int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_practice_bonus int;
    v_min_questions int;
    v_streak_record record;
    v_today date;
    v_yesterday date;
    v_new_streak int;
    v_new_longest int;
    v_vp_awarded int;
    v_base_points int;
    v_bonus_points int;
    v_multiplier numeric;
    v_multipliers jsonb;
    v_next_milestone int;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_today := current_date;
    v_yesterday := v_today - 1;

    -- 1. Get configuration
    SELECT COALESCE((config_value::text)::int, 100) INTO v_practice_bonus
    FROM point_configuration
    WHERE config_key = 'practice_streak_daily';

    SELECT COALESCE((config_value::text)::int, 3) INTO v_min_questions
    FROM point_configuration
    WHERE config_key = 'min_practice_questions';

    IF v_practice_bonus IS NULL THEN v_practice_bonus := 100; END IF;
    IF v_min_questions IS NULL THEN v_min_questions := 3; END IF;

    -- Get streak multipliers configuration
    SELECT COALESCE(config_value, '{"7": 1.5, "14": 2.0, "30": 2.5}'::jsonb) INTO v_multipliers
    FROM point_configuration
    WHERE config_key = 'streak_multipliers';

    -- Check min questions
    IF p_questions_answered < v_min_questions THEN
        RETURN jsonb_build_object(
            'streakCount', 0,
            'vpAwarded', 0
        );
    END IF;

    -- 2. Get or create user streak
    SELECT * INTO v_streak_record FROM user_streaks WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_streaks (user_id, practice_streak_count, practice_streak_last_date, longest_practice_streak)
        VALUES (v_user_id, 1, v_today, 1)
        RETURNING * INTO v_streak_record;
        v_new_streak := 1;
        v_new_longest := 1;
        v_base_points := v_practice_bonus;
        v_multiplier := 1.0;
        v_bonus_points := 0;
        v_vp_awarded := v_practice_bonus;
    ELSE
        -- Check if already practiced today
        IF v_streak_record.practice_streak_last_date = v_today THEN
            RETURN jsonb_build_object(
                'streakCount', v_streak_record.practice_streak_count,
                'vpAwarded', 0,
                'multiplier', 1.0,
                'basePoints', 0,
                'bonusPoints', 0,
                'nextMilestone', NULL
            );
        END IF;

        -- Check consecutive day
        IF v_streak_record.practice_streak_last_date = v_yesterday THEN
            v_new_streak := v_streak_record.practice_streak_count + 1;
        ELSE
            v_new_streak := 1;
        END IF;

        v_new_longest := GREATEST(v_new_streak, v_streak_record.longest_practice_streak);
        
        -- Calculate streak multiplier
        v_base_points := v_practice_bonus;
        v_multiplier := 1.0;
        v_bonus_points := 0;
        
        -- Check for multiplier milestones (30, 14, 7 - check highest first)
        IF v_new_streak >= 30 AND v_multipliers ? '30' THEN
            v_multiplier := (v_multipliers->>'30')::numeric;
        ELSIF v_new_streak >= 14 AND v_multipliers ? '14' THEN
            v_multiplier := (v_multipliers->>'14')::numeric;
        ELSIF v_new_streak >= 7 AND v_multipliers ? '7' THEN
            v_multiplier := (v_multipliers->>'7')::numeric;
        END IF;
        
        -- Apply multiplier
        IF v_multiplier > 1.0 THEN
            v_bonus_points := FLOOR(v_base_points * (v_multiplier - 1.0));
            v_vp_awarded := v_base_points + v_bonus_points;
        ELSE
            v_vp_awarded := v_base_points;
        END IF;

        -- Update streak
        UPDATE user_streaks
        SET practice_streak_count = v_new_streak,
            practice_streak_last_date = v_today,
            longest_practice_streak = v_new_longest,
            updated_at = now()
        WHERE id = v_streak_record.id;
    END IF;

    -- 3. Calculate next milestone
    IF v_new_streak < 7 THEN
        v_next_milestone := 7;
    ELSIF v_new_streak < 14 THEN
        v_next_milestone := 14;
    ELSIF v_new_streak < 30 THEN
        v_next_milestone := 30;
    ELSE
        v_next_milestone := NULL;
    END IF;

    -- 4. Award points
    IF v_vp_awarded > 0 THEN
        -- Record base points
        INSERT INTO velocity_points (user_id, amount, reason, metadata)
        VALUES (
            v_user_id,
            v_base_points,
            'practice_streak',
            jsonb_build_object(
                'streak_count', v_new_streak,
                'questions_answered', p_questions_answered,
                'date', v_today,
                'multiplier', v_multiplier
            )
        );
        
        -- Record bonus points separately if applicable
        IF v_bonus_points > 0 THEN
            INSERT INTO velocity_points (user_id, amount, reason, metadata)
            VALUES (
                v_user_id,
                v_bonus_points,
                'streak_multiplier',
                jsonb_build_object(
                    'streak_count', v_new_streak,
                    'multiplier', v_multiplier,
                    'base_reason', 'practice_streak',
                    'date', v_today
                )
            );
        END IF;

        -- Update user_levels total_vp
        INSERT INTO user_levels (user_id, total_vp)
        VALUES (v_user_id, v_vp_awarded)
        ON CONFLICT (user_id)
        DO UPDATE SET
            total_vp = user_levels.total_vp + EXCLUDED.total_vp,
            updated_at = now();
    END IF;

    RETURN jsonb_build_object(
        'streakCount', v_new_streak,
        'vpAwarded', v_vp_awarded,
        'multiplier', v_multiplier,
        'basePoints', v_base_points,
        'bonusPoints', v_bonus_points,
        'nextMilestone', v_next_milestone
    );
END;
$$;
