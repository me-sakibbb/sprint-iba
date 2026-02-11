-- ============================================
-- SECURE PRACTICE POINTS AWARDING
-- Moves point calculation and verification to server-side
-- Created: 2026-02-15
-- ============================================

CREATE OR REPLACE FUNCTION award_practice_answer_points(
    p_question_id uuid,
    p_user_answer text,
    p_time_taken integer DEFAULT 0,
    p_time_per_question integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_question_record record;
    v_config_correct jsonb;
    v_config_wrong jsonb;
    v_config_speed_max int;
    v_is_correct boolean;
    v_points integer := 0;
    v_speed_bonus integer := 0;
    v_difficulty text;
    v_current_vp integer;
    v_old_level integer;
    v_new_level integer;
    v_leveled_up boolean;
    v_user_level_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch question
    SELECT * INTO v_question_record FROM public.questions WHERE id = p_question_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    v_difficulty := COALESCE(v_question_record.difficulty, 'medium');

    -- Verify answer
    -- Logic for checking answer:
    -- 1. Exact match (case insensitive)
    -- 2. Index match (if answer is '0', '1' etc matching 'a', 'b')
    -- 3. Option text match

    DECLARE
        v_correct_str text := lower(trim(v_question_record.correct_answer));
        v_user_str text := lower(trim(p_user_answer));
        v_options jsonb := to_jsonb(v_question_record.options);
        v_user_index integer;
        v_labels text[] := ARRAY['a','b','c','d','e'];
        v_option_text text;
    BEGIN
        v_is_correct := false;

        -- 1. Direct match
        IF v_user_str = v_correct_str THEN
            v_is_correct := true;
        ELSE
            -- Try to resolve user label to index
            -- array_position returns 1-based index or NULL
            v_user_index := array_position(v_labels, v_user_str);

            IF v_user_index IS NOT NULL THEN
                 -- Convert to 0-based index for logic
                 v_user_index := v_user_index - 1;

                 -- 2. Index match
                 IF (v_user_index)::text = v_correct_str THEN
                     v_is_correct := true;
                 -- 3. Option text match
                 ELSIF v_options IS NOT NULL AND jsonb_array_length(v_options) > v_user_index THEN
                     v_option_text := v_options->>v_user_index;
                     IF lower(trim(v_option_text)) = v_correct_str THEN
                         v_is_correct := true;
                     END IF;
                 END IF;
            END IF;
        END IF;
    END;

    -- Get point configuration
    SELECT config_value INTO v_config_correct FROM public.point_configuration WHERE config_key = 'point_values_correct';
    SELECT config_value INTO v_config_wrong FROM public.point_configuration WHERE config_key = 'point_values_wrong';
    SELECT (config_value)::int INTO v_config_speed_max FROM public.point_configuration WHERE config_key = 'speed_bonus_max';

    -- Default configs if missing
    IF v_config_correct IS NULL THEN v_config_correct := '{"easy": 50, "medium": 100, "hard": 200}'::jsonb; END IF;
    IF v_config_wrong IS NULL THEN v_config_wrong := '{"easy": -15, "medium": -25, "hard": -40}'::jsonb; END IF;
    IF v_config_speed_max IS NULL THEN v_config_speed_max := 50; END IF;

    IF v_is_correct THEN
        v_points := (v_config_correct->>v_difficulty)::int;

        -- Speed bonus
        IF p_time_taken IS NOT NULL AND p_time_per_question IS NOT NULL AND p_time_per_question > 0 THEN
             DECLARE
                v_time_remaining int := p_time_per_question - p_time_taken;
             BEGIN
                IF v_time_remaining > 0 THEN
                     -- Linear scale calculation
                     v_speed_bonus := round((v_time_remaining::float / p_time_per_question::float) * v_config_speed_max);
                     v_points := v_points + v_speed_bonus;
                END IF;
             END;
        END IF;
    ELSE
        v_points := (v_config_wrong->>v_difficulty)::int;
    END IF;

    -- Handle nulls
    IF v_points IS NULL THEN v_points := 0; END IF;

    -- Insert transaction
    INSERT INTO public.velocity_points (user_id, amount, reason, question_id, metadata)
    VALUES (
        v_user_id,
        v_points,
        CASE WHEN v_is_correct THEN 'correct_answer' ELSE 'wrong_answer' END,
        p_question_id,
        jsonb_build_object(
            'difficulty', v_difficulty,
            'time_taken', p_time_taken,
            'speed_bonus', v_speed_bonus
        )
    );

    -- Update User Levels
    -- First, get current state or create if not exists
    SELECT id, total_vp, current_level INTO v_user_level_id, v_current_vp, v_old_level
    FROM public.user_levels WHERE user_id = v_user_id;

    IF v_user_level_id IS NULL THEN
        v_current_vp := 0;
        v_old_level := 1;
        INSERT INTO public.user_levels (user_id, total_vp, current_level)
        VALUES (v_user_id, 0, 1)
        RETURNING id INTO v_user_level_id;
    END IF;

    -- Update VP
    v_current_vp := GREATEST(0, v_current_vp + v_points);

    -- Calculate new level based on hardcoded thresholds
    v_new_level := 1;
    IF v_current_vp >= 4000000 THEN v_new_level := 12;
    ELSIF v_current_vp >= 2000000 THEN v_new_level := 11;
    ELSIF v_current_vp >= 1000000 THEN v_new_level := 10;
    ELSIF v_current_vp >= 550000 THEN v_new_level := 9;
    ELSIF v_current_vp >= 300000 THEN v_new_level := 8;
    ELSIF v_current_vp >= 150000 THEN v_new_level := 7;
    ELSIF v_current_vp >= 75000 THEN v_new_level := 6;
    ELSIF v_current_vp >= 35000 THEN v_new_level := 5;
    ELSIF v_current_vp >= 15000 THEN v_new_level := 4;
    ELSIF v_current_vp >= 5000 THEN v_new_level := 3;
    ELSIF v_current_vp >= 1500 THEN v_new_level := 2;
    END IF;

    v_leveled_up := v_new_level > v_old_level;

    -- Update table
    UPDATE public.user_levels
    SET
        total_vp = v_current_vp,
        current_level = v_new_level,
        last_level_up_at = CASE WHEN v_leveled_up THEN now() ELSE last_level_up_at END,
        updated_at = now()
    WHERE id = v_user_level_id;

    RETURN jsonb_build_object(
        'vpAwarded', v_points,
        'isCorrect', v_is_correct,
        'speedBonus', v_speed_bonus,
        'newTotalVP', v_current_vp,
        'newLevel', v_new_level,
        'leveledUp', v_leveled_up
    );
END;
$$;
