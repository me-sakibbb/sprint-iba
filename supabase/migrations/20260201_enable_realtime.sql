-- Enable replication for Realtime on specific tables
alter publication supabase_realtime add table user_levels;
alter publication supabase_realtime add table user_streaks;

-- Optional: Add other tables if needed
-- alter publication supabase_realtime add table velocity_points;
