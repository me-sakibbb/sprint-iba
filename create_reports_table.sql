-- Create a table for reporting issues with questions
create table if not exists public.question_reports (
    id uuid default gen_random_uuid() primary key,
    question_id uuid references public.questions(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    report_reason text not null,
    additional_details text,
    status text default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.question_reports enable row level security;

-- Policies
-- Users can insert their own reports
create policy "Users can insert their own reports"
    on public.question_reports for insert
    with check (auth.uid() = user_id);

-- Operators/Admins can view all reports (assuming role-based access or just public for now for simplicity in dev, but ideally restricted)
-- For now, allow users to view their own reports
create policy "Users can view their own reports"
    on public.question_reports for select
    using (auth.uid() = user_id);

-- Allow public insert if user is not logged in (optional, but good for guests)
-- If you want to allow anonymous reports:
create policy "Anyone can insert reports"
    on public.question_reports for insert
    with check (true);
