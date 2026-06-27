do $$
begin
  create type public.lockin_focus_session_status as enum ('active', 'completed', 'interrupted', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.focus_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  focus_duration_minutes integer not null check (focus_duration_minutes between 1 and 240),
  break_count integer not null default 0 check (break_count between 0 and 20),
  break_duration_minutes integer not null default 5 check (break_duration_minutes between 1 and 120),
  long_break_duration_minutes integer not null default 15 check (long_break_duration_minutes between 1 and 240),
  sessions_before_long_break integer not null default 4 check (sessions_before_long_break between 1 and 20),
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name)
);

alter table public.tasks
add column if not exists description text;

alter table public.focus_sessions
add column if not exists preset_id uuid,
add column if not exists planned_duration_minutes integer,
add column if not exists actual_duration_seconds integer,
add column if not exists interruption_count integer not null default 0,
add column if not exists status public.lockin_focus_session_status not null default 'active';

alter table public.focus_sessions
drop constraint if exists focus_sessions_preset_owner_fk;

alter table public.focus_sessions
add constraint focus_sessions_preset_owner_fk
foreign key (user_id, preset_id)
references public.focus_presets(user_id, id)
on delete set null (preset_id);

alter table public.focus_sessions
drop constraint if exists focus_sessions_planned_duration_check;

alter table public.focus_sessions
add constraint focus_sessions_planned_duration_check
check (planned_duration_minutes is null or planned_duration_minutes between 1 and 1440);

alter table public.focus_sessions
drop constraint if exists focus_sessions_actual_duration_check;

alter table public.focus_sessions
add constraint focus_sessions_actual_duration_check
check (actual_duration_seconds is null or actual_duration_seconds between 0 and 86400);

alter table public.focus_sessions
drop constraint if exists focus_sessions_interruption_count_check;

alter table public.focus_sessions
add constraint focus_sessions_interruption_count_check
check (interruption_count >= 0);

alter table public.focus_sessions
drop constraint if exists focus_sessions_status_booleans_check;

alter table public.focus_sessions
add constraint focus_sessions_status_booleans_check
check (
  (status = 'active' and completed = false and interrupted = false and ended_at is null)
  or (status = 'completed' and completed = true and interrupted = false and ended_at is not null)
  or (status = 'interrupted' and completed = false and interrupted = true and ended_at is not null)
  or (status = 'cancelled' and completed = false and interrupted = false and ended_at is not null)
);

create trigger focus_presets_set_updated_at
before update on public.focus_presets
for each row execute function public.set_updated_at();

create index if not exists focus_presets_user_id_sort_order_idx on public.focus_presets (user_id, sort_order, created_at);
create unique index if not exists focus_presets_one_default_per_user_idx on public.focus_presets (user_id) where is_default;
create index if not exists focus_sessions_user_id_preset_id_idx on public.focus_sessions (user_id, preset_id) where preset_id is not null;
create index if not exists focus_sessions_user_id_status_started_at_idx on public.focus_sessions (user_id, status, started_at desc);

alter table public.focus_presets enable row level security;

create policy "focus_presets_select_own" on public.focus_presets
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "focus_presets_insert_own" on public.focus_presets
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "focus_presets_update_own" on public.focus_presets
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "focus_presets_delete_own" on public.focus_presets
for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
begin
  profile_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');

  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(profile_name, split_part(new.email, '@', 1), 'User'), 120)
  )
  on conflict (id) do nothing;

  insert into public.focus_presets (
    user_id,
    name,
    focus_duration_minutes,
    break_count,
    break_duration_minutes,
    long_break_duration_minutes,
    sessions_before_long_break,
    sort_order,
    is_default
  )
  values (
    new.id,
    'Deep Work',
    25,
    3,
    5,
    15,
    4,
    0,
    true
  )
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
