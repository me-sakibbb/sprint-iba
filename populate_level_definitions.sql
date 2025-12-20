-- ============================================
-- Populate Level Definitions for VP System
-- Academic Athlete Gamification - 12 Levels
-- ============================================

-- Clear existing data (optional - only if re-running)
-- DELETE FROM public.level_definitions;

-- Insert all 12 levels with their configurations
INSERT INTO public.level_definitions (id, name, description, vp_threshold, track, track_color, badge_image_url) VALUES
-- TRACK 1: The Warm-Up (Bronze/Green)
(1, 'The Rookie', 'You''ve stepped onto the track. Time to lace up.', 0, 'WARM_UP', '#cd7f32', '/assets/badges/rookie.png'),
(2, 'The Stretcher', 'Warming up the mental muscles.', 1500, 'WARM_UP', '#90ee90', '/assets/badges/stretcher.svg'),
(3, 'The Jogger', 'Finding a steady rhythm in your studies.', 5000, 'WARM_UP', '#228b22', '/assets/badges/jogger.svg'),

-- TRACK 2: Picking Up Pace (Silver/Blue)
(4, 'The Pacer', 'You are hitting consistent targets. Keep this tempo!', 15000, 'PICKING_UP_PACE', '#c0c0c0', '/assets/badges/pacer.svg'),
(5, 'The Strider', 'Covering more ground with every session.', 35000, 'PICKING_UP_PACE', '#4169e1', '/assets/badges/strider.svg'),
(6, 'The Hurdler', 'Obstacles don''t stop you; you jump right over them.', 75000, 'PICKING_UP_PACE', '#1e90ff', '/assets/badges/hurdler.svg'),

-- TRACK 3: The Fast Lane (Gold/Orange/Red)
(7, 'The Sprinter', 'Full speed ahead. You are a serious contender.', 150000, 'FAST_LANE', '#ffd700', '/assets/badges/sprinter.svg'),
(8, 'The Velocity Master', 'You are moving faster than the competition.', 300000, 'FAST_LANE', '#ff8c00', '/assets/badges/velocity_master.svg'),
(9, 'The Mach 1', 'Breaking personal records every day. Supersonic mental speed.', 550000, 'FAST_LANE', '#ff4500', '/assets/badges/mach1.svg'),

-- TRACK 4: The Podium Finish (Platinum/Neon Purple/Diamond)
(10, 'The Olympian', 'You are in the top tier of aspirants. Elite performance.', 1000000, 'PODIUM', '#e5e4e2', '/assets/badges/olympian.svg'),
(11, 'The Record Breaker', 'You aren''t just participating; you are redefining the standard.', 2000000, 'PODIUM', '#9d00ff', '/assets/badges/record_breaker.svg'),
(12, 'The IBA Titan', 'The finish line is yours. You are ready to conquer the admission test.', 4000000, 'PODIUM', '#b9f2ff', '/assets/badges/iba_titan.svg')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    vp_threshold = EXCLUDED.vp_threshold,
    track = EXCLUDED.track,
    track_color = EXCLUDED.track_color,
    badge_image_url = EXCLUDED.badge_image_url;

-- Verify the data
SELECT id, name, vp_threshold, track FROM public.level_definitions ORDER BY vp_threshold;
