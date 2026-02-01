-- Enable RLS for user_levels if not already enabled
ALTER TABLE IF EXISTS public.user_levels ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own level data
-- This is critical for Realtime subscriptions to work for the client
CREATE POLICY "Users can view own level"
    ON public.user_levels FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own level (e.g. init)
CREATE POLICY "Users can insert own level"
    ON public.user_levels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own level (or service can)
CREATE POLICY "Users can update own level"
    ON public.user_levels FOR UPDATE
    USING (auth.uid() = user_id);
