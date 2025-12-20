-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Game Players
create table if not exists game_players (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null unique,
  position_index integer default 0,
  balance integer default 1000, -- Initial Sprint Points
  color text default '#4ade80', -- Default Green
  avatar_url text, 
  last_active timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Game Tiles (The Board)
create table if not exists game_tiles (
  id uuid default uuid_generate_v4() primary key,
  position_index integer not null unique, -- 0 to 39
  type text not null, -- 'PROPERTY', 'GO', 'CHANCE', 'JAIL', 'PARKING'
  name text not null,
  owner_id uuid references game_players(id),
  word_id uuid references questions(id), -- The 'Defense' word
  rent_value integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Game Cards (Inventory)
create table if not exists game_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  word_id uuid references questions(id) not null,
  power integer default 10,
  status text default 'IN_HAND', -- 'IN_HAND', 'USED', 'DEFENDING'
  obtained_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table game_players enable row level security;
alter table game_tiles enable row level security;
alter table game_cards enable row level security;

-- Allow read access to everyone (game state is public)
create policy "Public read game_players" on game_players for select using (true);
create policy "Public read game_tiles" on game_tiles for select using (true);
create policy "Public read game_cards" on game_cards for select using (true);

-- Allow insert/update for own player data
create policy "Users can update own player" on game_players for update using (auth.uid() = user_id);
create policy "Users can insert own player" on game_players for insert with check (auth.uid() = user_id);

-- Tiles can be updated by anyone (for now, logic handled in client/edge) - strictly this should be server-side, but for MVP client-side with RLS
-- Actually, we'll open it up for MVP and trust the client logic (since we don't have Edge Functions set up easily yet).
create policy "Public update tiles" on game_tiles for update using (true);

-- Cards
create policy "Users can update own cards" on game_cards for update using (auth.uid() = user_id);
