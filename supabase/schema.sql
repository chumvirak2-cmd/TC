create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "Public app state can be read"
  on public.app_state for select
  using (true);

create policy "Public app state can be inserted"
  on public.app_state for insert
  with check (true);

create policy "Public app state can be updated"
  on public.app_state for update
  using (true)
  with check (true);

alter publication supabase_realtime add table public.app_state;
