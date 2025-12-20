-- Lexicon Sprint Schema (RESET / FIX)
-- WARNING: This will clear existing VocabRace game data to ensure a clean start for Lexicon Sprint.

-- 1. CLEANUP (Drop old tables/policies if they differ or cause conflicts)
drop table if exists game_round_answers cascade; -- From VocabRace
drop table if exists game_participants cascade;
drop table if exists game_lobbies cascade;

-- 2. Lobbies
create table game_lobbies (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references auth.users not null,
  status text check (status in ('WAITING', 'PLAYING', 'FINISHED')) default 'WAITING',
  settings jsonb default '{"laps": 1, "difficulty": "Intermediate", "timer_seconds": 15}'::jsonb,
  current_question_id uuid references questions(id), 
  round_start_time timestamp with time zone,
  
  -- Event Logic
  rounds_played integer default 0,
  active_event_card text, 
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Participants
create table game_participants (
  id uuid default uuid_generate_v4() primary key,
  lobby_id uuid references game_lobbies(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  
  -- Race State
  position_index integer default 0, -- 0-50
  
  -- Mechanics (Lexicon Specific)
  current_streak integer default 0,
  is_frozen boolean default false, 
  jail_answers_correct integer default 0,
  
  -- Display
  avatar_url text,
  username text,
  
  -- Round Scope
  last_answer_time integer, 
  last_answer_correct boolean,
  
  unique(lobby_id, user_id)
);

-- 4. RLS
alter table game_lobbies enable row level security;
alter table game_participants enable row level security;

-- Policies (Re-create safe)
create policy "Public read lobbies" on game_lobbies for select using (true);
create policy "Public insert lobbies" on game_lobbies for insert with check (auth.uid() = host_id);
create policy "Public update lobbies" on game_lobbies for update using (true);

create policy "Public read participants" on game_participants for select using (true);
create policy "Public insert participants" on game_participants for insert with check (auth.uid() = user_id);
create policy "Public update participants" on game_participants for update using (true);
