create table if not exists public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  question_id uuid references public.questions not null,
  is_correct boolean not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_progress enable row level security;

-- Policy: Users can insert their own progress
create policy "Users can insert their own progress"
on public.user_progress for insert
with check (auth.uid() = user_id);

-- Policy: Users can view their own progress
create policy "Users can view their own progress"
on public.user_progress for select
using (auth.uid() = user_id);
