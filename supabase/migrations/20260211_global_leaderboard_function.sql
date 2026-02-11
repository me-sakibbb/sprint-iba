-- ============================================
-- GLOBAL LEADERBOARD FUNCTION
-- Creates efficient function for leaderboard queries with ranking
-- Created: 2026-02-11
-- ============================================

-- Function to get global leaderboard with rankings
CREATE OR REPLACE FUNCTION get_global_leaderboard(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_time_filter TEXT DEFAULT 'all_time' -- 'all_time', 'weekly', 'monthly'
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    total_vp BIGINT,
    current_level INTEGER,
    level_name TEXT,
    level_color TEXT,
    level_icon_url TEXT,
    global_rank BIGINT,
    total_users BIGINT,
    login_streak INTEGER,
    practice_streak INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            ul.user_id,
            ul.total_vp,
            ul.current_level,
            ul.updated_at,
            ROW_NUMBER() OVER (ORDER BY ul.total_vp DESC, ul.updated_at ASC) as rank,
            COUNT(*) OVER () as total_count
        FROM public.user_levels ul
        WHERE ul.total_vp >= 0
    ),
    user_data AS (
        SELECT 
            ru.user_id,
            p.full_name,
            p.email,
            p.avatar_url,
            ru.total_vp,
            ru.current_level,
            l.name as level_name,
            l.color as level_color,
            l.icon_url as level_icon_url,
            ru.rank as global_rank,
            ru.total_count as total_users,
            COALESCE(us.login_streak_count, 0) as login_streak,
            COALESCE(us.practice_streak_count, 0) as practice_streak
        FROM ranked_users ru
        INNER JOIN public.profiles p ON p.id = ru.user_id
        LEFT JOIN public.levels l ON l.rank = ru.current_level
        LEFT JOIN public.user_streaks us ON us.user_id = ru.user_id
        WHERE 
            (p_search IS NULL OR 
             p.full_name ILIKE '%' || p_search || '%' OR 
             p.email ILIKE '%' || p_search || '%')
        ORDER BY ru.rank ASC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT * FROM user_data;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get a specific user's rank
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    total_vp BIGINT,
    current_level INTEGER,
    level_name TEXT,
    level_color TEXT,
    level_icon_url TEXT,
    global_rank BIGINT,
    total_users BIGINT,
    login_streak INTEGER,
    practice_streak INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            ul.user_id,
            ul.total_vp,
            ul.current_level,
            ul.updated_at,
            ROW_NUMBER() OVER (ORDER BY ul.total_vp DESC, ul.updated_at ASC) as rank,
            COUNT(*) OVER () as total_count
        FROM public.user_levels ul
        WHERE ul.total_vp >= 0
    )
    SELECT 
        ru.user_id,
        p.full_name,
        p.email,
        p.avatar_url,
        ru.total_vp,
        ru.current_level,
        l.name as level_name,
        l.color as level_color,
        l.icon_url as level_icon_url,
        ru.rank as global_rank,
        ru.total_count as total_users,
        COALESCE(us.login_streak_count, 0) as login_streak,
        COALESCE(us.practice_streak_count, 0) as practice_streak
    FROM ranked_users ru
    INNER JOIN public.profiles p ON p.id = ru.user_id
    LEFT JOIN public.levels l ON l.rank = ru.current_level
    LEFT JOIN public.user_streaks us ON us.user_id = ru.user_id
    WHERE ru.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_levels_vp_desc ON public.user_levels(total_vp DESC, updated_at ASC);
CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING gin(to_tsvector('english', COALESCE(full_name, '') || ' ' || email));
