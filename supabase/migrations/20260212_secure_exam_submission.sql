-- Secure Exam Submission Migration
-- Created: 2026-02-12

-- 1. Helper function for level calculation
CREATE OR REPLACE FUNCTION calculate_level(vp integer) RETURNS integer AS $$
BEGIN
    IF vp >= 4000000 THEN RETURN 12;
    ELSIF vp >= 2000000 THEN RETURN 11;
    ELSIF vp >= 1000000 THEN RETURN 10;
    ELSIF vp >= 550000 THEN RETURN 9;
    ELSIF vp >= 300000 THEN RETURN 8;
    ELSIF vp >= 150000 THEN RETURN 7;
    ELSIF vp >= 75000 THEN RETURN 6;
    ELSIF vp >= 35000 THEN RETURN 5;
    ELSIF vp >= 15000 THEN RETURN 4;
    ELSIF vp >= 5000 THEN RETURN 3;
    ELSIF vp >= 1500 THEN RETURN 2;
    ELSE RETURN 1;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Helper function for robust answer comparison
CREATE OR REPLACE FUNCTION check_answer(user_answer text, correct_answer text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Handle NULLs
    IF user_answer IS NULL OR correct_answer IS NULL THEN
        RETURN false;
    END IF;

    -- Direct match (case insensitive)
    IF lower(user_answer) = lower(correct_answer) THEN
        RETURN true;
    END IF;

    -- Map A->0, B->1, etc. (case insensitive)
    IF user_answer ~* '^[A-E]$' AND correct_answer ~ '^[0-4]$' THEN
        RETURN (ascii(upper(user_answer)) - ascii('A'))::text = correct_answer;
    END IF;

    -- Map 0->A, 1->B, etc.
    IF user_answer ~ '^[0-4]$' AND correct_answer ~* '^[A-E]$' THEN
        RETURN (ascii(upper(correct_answer)) - ascii('A'))::text = user_answer;
    END IF;

    RETURN false;
END;
$$;

-- 3. Secure exam submission function
CREATE OR REPLACE FUNCTION submit_exam_attempt(
    p_attempt_id uuid,
    p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt record;
    v_exam_id uuid;
    v_user_id uuid;
    v_questions record;
    v_score integer := 0;
    v_total_questions integer := 0;
    v_completion_bonus integer;
    v_perfect_bonus integer;
    v_top_10_bonus integer;
    v_score_bonus integer := 0;
    v_points_awarded integer := 0;
    v_percentile numeric;
    v_rank integer;
    v_total_attempts integer;
    v_current_vp integer;
    v_current_level integer;
    v_new_total_vp integer;
    v_new_level integer;
    v_leveled_up boolean := false;
    v_bonus_metadata jsonb;
BEGIN
    -- Verify attempt ownership and status
    SELECT * INTO v_attempt
    FROM exam_attempts
    WHERE id = p_attempt_id;

    IF v_attempt IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    IF v_attempt.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_attempt.is_submitted THEN
        RAISE EXCEPTION 'Attempt already submitted';
    END IF;

    v_exam_id := v_attempt.exam_id;
    v_user_id := v_attempt.user_id;

    -- Calculate Score
    FOR v_questions IN
        SELECT id, correct_answer
        FROM questions
        WHERE id IN (
            SELECT unnest(question_ids)
            FROM exams
            WHERE id = v_exam_id
        )
    LOOP
        v_total_questions := v_total_questions + 1;

        -- Check if user answered this question correctly
        IF check_answer(p_answers->>v_questions.id::text, v_questions.correct_answer) THEN
            v_score := v_score + 1;
        END IF;

        -- Update user_progress
        INSERT INTO user_progress (user_id, question_id, is_correct, answered_at)
        VALUES (v_user_id, v_questions.id, check_answer(p_answers->>v_questions.id::text, v_questions.correct_answer), now())
        ON CONFLICT (user_id, question_id)
        DO UPDATE SET is_correct = EXCLUDED.is_correct, answered_at = EXCLUDED.answered_at;
    END LOOP;

    -- Update Attempt
    UPDATE exam_attempts
    SET
        answers = p_answers,
        score = v_score,
        total_questions = v_total_questions,
        is_submitted = true,
        submitted_at = now()
    WHERE id = p_attempt_id;

    -- Calculate Percentile
    SELECT count(*) INTO v_total_attempts
    FROM exam_attempts
    WHERE exam_id = v_exam_id AND is_submitted = true;

    SELECT count(*) INTO v_rank
    FROM exam_attempts
    WHERE exam_id = v_exam_id AND is_submitted = true AND score > v_score;

    IF v_total_attempts > 1 THEN
        v_percentile := (1.0 - (v_rank::numeric / v_total_attempts::numeric)) * 100.0;
    ELSE
        v_percentile := 100.0;
    END IF;

    -- Calculate Points
    v_completion_bonus := COALESCE(
        (SELECT (config_value::text)::numeric::integer
         FROM point_configuration
         WHERE config_key = 'exam_completion_bonus'),
        500
    );

    v_perfect_bonus := COALESCE(
        (SELECT (config_value::text)::numeric::integer
         FROM point_configuration
         WHERE config_key = 'exam_perfect_bonus'),
        2000
    );

    v_top_10_bonus := COALESCE(
        (SELECT (config_value::text)::numeric::integer
         FROM point_configuration
         WHERE config_key = 'exam_top_10_bonus'),
        1000
    );

    v_points_awarded := v_completion_bonus;

    IF v_score = v_total_questions AND v_total_questions > 0 THEN
        v_score_bonus := v_perfect_bonus;
    ELSIF v_percentile >= 90 THEN
        v_score_bonus := v_top_10_bonus;
    END IF;

    v_points_awarded := v_points_awarded + v_score_bonus;

    v_bonus_metadata := jsonb_build_object(
        'exam_id', v_exam_id,
        'score', v_score,
        'total_questions', v_total_questions,
        'percentile', v_percentile,
        'score_bonus', v_score_bonus
    );

    -- Award Points
    INSERT INTO velocity_points (user_id, amount, reason, metadata)
    VALUES (v_user_id, v_completion_bonus, 'exam_complete', v_bonus_metadata);

    IF v_score_bonus > 0 THEN
        INSERT INTO velocity_points (user_id, amount, reason, metadata)
        VALUES (
            v_user_id,
            v_score_bonus,
            CASE WHEN v_score = v_total_questions THEN 'perfect_score' ELSE 'high_score' END,
            v_bonus_metadata
        );
    END IF;

    -- Update User Level
    SELECT total_vp, current_level INTO v_current_vp, v_current_level
    FROM user_levels
    WHERE user_id = v_user_id;

    IF v_current_vp IS NULL THEN
        v_current_vp := 0;
        v_current_level := 1;
        INSERT INTO user_levels (user_id, total_vp, current_level)
        VALUES (v_user_id, 0, 1);
    END IF;

    v_new_total_vp := v_current_vp + v_points_awarded;
    v_new_level := calculate_level(v_new_total_vp);

    IF v_new_level > v_current_level THEN
        v_leveled_up := true;
    END IF;

    UPDATE user_levels
    SET
        total_vp = v_new_total_vp,
        current_level = v_new_level,
        last_level_up_at = CASE WHEN v_leveled_up THEN now() ELSE last_level_up_at END,
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'score', v_score,
        'total_questions', v_total_questions,
        'points_awarded', v_points_awarded,
        'percentile', v_percentile,
        'leveled_up', v_leveled_up,
        'new_level', v_new_level,
        'new_total_vp', v_new_total_vp
    );
END;
$$;
