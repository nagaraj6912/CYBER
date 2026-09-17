create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  minutes integer not null default 0 check (minutes between 1 and 1440),
  topic text,
  studied_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request text not null,
  proposal jsonb not null,
  status text not null default 'pending' check (status in ('pending','applied','rejected')),
  created_at timestamptz not null default now()
);

create table public.roadmap_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  change jsonb not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles, public.task_completions, public.study_sessions, public.notes, public.proposals, public.roadmap_changes to authenticated;
grant all on public.profiles, public.task_completions, public.study_sessions, public.notes, public.proposals, public.roadmap_changes to service_role;

alter table public.profiles enable row level security;
alter table public.task_completions enable row level security;
alter table public.study_sessions enable row level security;
alter table public.notes enable row level security;
alter table public.proposals enable row level security;
alter table public.roadmap_changes enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own completions" on public.task_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own proposals" on public.proposals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own roadmap changes" on public.roadmap_changes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.update_updated_at_column() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger update_notes_updated_at before update on public.notes
for each row execute function public.update_updated_at_column();