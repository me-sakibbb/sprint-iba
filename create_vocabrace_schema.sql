-- VocabRace Schema
-- 1. Lobbies
create table if not exists game_lobbies (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references auth.users not null,
  status text check (status in ('WAITING', 'PLAYING', 'FINISHED')) default 'WAITING',
  settings jsonb default '{"laps": 10, "difficulty": "Intermediate"}'::jsonb,
  current_question_id uuid references questions(id), 
  round_start_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Participants
create table if not exists game_participants (
  id uuid default uuid_generate_v4() primary key,
  lobby_id uuid references game_lobbies(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  
  -- Race State
  position_index integer default 0, -- Total tiles moved (track progress)
  laps_completed integer default 0,
  
  -- Display
  avatar_url text,
  username text, -- Cached for ease
  
  -- Status
  status text default 'READY', -- 'READY', 'ANSWERED', 'FINISHED'
  
  unique(lobby_id, user_id)
);

-- 3. Round Answers (Transient round data)
create table if not exists game_round_answers (
  id uuid default uuid_generate_v4() primary key,
  lobby_id uuid references game_lobbies(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  question_id uuid references questions(id) not null,
  
  selected_option text,
  is_correct boolean,
  time_taken_ms integer,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table game_lobbies enable row level security;
alter table game_participants enable row level security;
alter table game_round_answers enable row level security;

-- Public Read/Write for MVP (Simplify realtime)
create policy "Public read lobbies" on game_lobbies for select using (true);
create policy "Public insert lobbies" on game_lobbies for insert with check (auth.uid() = host_id);
create policy "Host update lobby" on game_lobbies for update using (true); -- Allow anyone to update for now to allow "Joiners" to trigger updates if needed, logic protected by Client for MVP. Ideally strict RLS.

create policy "Public read participants" on game_participants for select using (true);
create policy "Public insert participants" on game_participants for insert with check (auth.uid() = user_id);
create policy "Public update participants" on game_participants for update using (true); -- Host updates positions

create policy "Public read answers" on game_round_answers for select using (true);
create policy "Public insert answers" on game_round_answers for insert with check (auth.uid() = user_id);
