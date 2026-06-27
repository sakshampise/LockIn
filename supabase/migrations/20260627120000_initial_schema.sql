create extension if not exists pgcrypto;

do $$
begin
  create type public.lockin_task_priority as enum ('low', 'medium', 'high', 'urgent');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lockin_recurrence as enum ('none', 'daily', 'weekly', 'monthly');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lockin_theme as enum ('dark', 'light');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lockin_focus_target_type as enum ('page', 'task');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lockin_import_source as enum ('notion');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lockin_import_status as enum ('uploaded', 'mapping', 'review', 'importing', 'completed', 'failed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lockin_import_item_type as enum ('page', 'task');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'User' check (char_length(btrim(display_name)) between 1 and 120),
  daily_focus_goal_minutes integer not null default 360 check (daily_focus_goal_minutes between 1 and 1440),
  default_session_minutes integer not null default 25 check (default_session_minutes between 1 and 240),
  theme public.lockin_theme not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name)
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_id uuid,
  tag_id uuid,
  title text not null default 'Untitled' check (char_length(btrim(title)) between 1 and 200),
  content text not null default '',
  icon text check (icon is null or char_length(icon) <= 32),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint pages_parent_owner_fk foreign key (user_id, parent_id) references public.pages(user_id, id) on delete cascade,
  constraint pages_tag_owner_fk foreign key (user_id, tag_id) references public.tags(user_id, id) on delete set null (tag_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  page_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  done boolean not null default false,
  priority public.lockin_task_priority not null default 'medium',
  due_date date,
  recurrence public.lockin_recurrence not null default 'none',
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint tasks_page_owner_fk foreign key (user_id, page_id) references public.pages(user_id, id) on delete set null (page_id),
  constraint tasks_completion_state_check check (
    (done = true and completed_at is not null)
    or (done = false and completed_at is null)
  )
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type public.lockin_focus_target_type not null,
  target_page_id uuid,
  target_task_id uuid,
  target_title text not null check (char_length(btrim(target_title)) between 1 and 300),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed boolean not null default false,
  interrupted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint focus_sessions_page_owner_fk foreign key (user_id, target_page_id) references public.pages(user_id, id) on delete set null (target_page_id),
  constraint focus_sessions_task_owner_fk foreign key (user_id, target_task_id) references public.tasks(user_id, id) on delete set null (target_task_id),
  constraint focus_sessions_target_shape_check check (
    (target_type = 'page' and target_task_id is null)
    or (target_type = 'task' and target_page_id is null)
  ),
  constraint focus_sessions_status_check check (not (completed and interrupted)),
  constraint focus_sessions_end_state_check check (
    (ended_at is null and completed = false and interrupted = false)
    or (ended_at is not null)
  ),
  constraint focus_sessions_time_check check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.interruptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null,
  reason text check (reason is null or char_length(reason) <= 500),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interruptions_session_owner_fk foreign key (user_id, session_id) references public.focus_sessions(user_id, id) on delete cascade
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source public.lockin_import_source not null default 'notion',
  status public.lockin_import_status not null default 'uploaded',
  file_name text check (file_name is null or char_length(file_name) <= 260),
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  detected_pages integer not null default 0 check (detected_pages >= 0),
  detected_tasks integer not null default 0 check (detected_tasks >= 0),
  mapped_pages integer not null default 0 check (mapped_pages >= 0),
  mapped_tasks integer not null default 0 check (mapped_tasks >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, id),
  constraint import_jobs_completed_status_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed')
  )
);

create table if not exists public.import_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid not null,
  item_type public.lockin_import_item_type not null,
  source_id text,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  payload jsonb not null default '{}'::jsonb,
  mapped_page_id uuid,
  mapped_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_items_job_owner_fk foreign key (user_id, job_id) references public.import_jobs(user_id, id) on delete cascade,
  constraint import_items_page_owner_fk foreign key (user_id, mapped_page_id) references public.pages(user_id, id) on delete set null (mapped_page_id),
  constraint import_items_task_owner_fk foreign key (user_id, mapped_task_id) references public.tasks(user_id, id) on delete set null (mapped_task_id),
  constraint import_items_mapping_shape_check check (
    (item_type = 'page' and mapped_task_id is null)
    or (item_type = 'task' and mapped_page_id is null)
  )
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

create trigger pages_set_updated_at
before update on public.pages
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger focus_sessions_set_updated_at
before update on public.focus_sessions
for each row execute function public.set_updated_at();

create trigger interruptions_set_updated_at
before update on public.interruptions
for each row execute function public.set_updated_at();

create trigger import_jobs_set_updated_at
before update on public.import_jobs
for each row execute function public.set_updated_at();

create trigger import_items_set_updated_at
before update on public.import_items
for each row execute function public.set_updated_at();

create index if not exists tags_user_id_updated_at_idx on public.tags (user_id, updated_at desc);
create index if not exists pages_user_id_parent_id_sort_order_idx on public.pages (user_id, parent_id, sort_order, updated_at desc);
create index if not exists pages_user_id_updated_at_idx on public.pages (user_id, updated_at desc);
create index if not exists pages_user_id_tag_id_idx on public.pages (user_id, tag_id) where tag_id is not null;
create index if not exists tasks_user_id_done_due_date_idx on public.tasks (user_id, done, due_date);
create index if not exists tasks_user_id_page_id_idx on public.tasks (user_id, page_id) where page_id is not null;
create index if not exists tasks_user_id_updated_at_idx on public.tasks (user_id, updated_at desc);
create index if not exists focus_sessions_user_id_started_at_idx on public.focus_sessions (user_id, started_at desc);
create index if not exists focus_sessions_user_id_completed_started_at_idx on public.focus_sessions (user_id, completed, started_at desc);
create unique index if not exists focus_sessions_one_active_per_user_idx on public.focus_sessions (user_id) where ended_at is null;
create index if not exists interruptions_user_id_session_id_idx on public.interruptions (user_id, session_id);
create index if not exists import_jobs_user_id_status_created_at_idx on public.import_jobs (user_id, status, created_at desc);
create index if not exists import_items_user_id_job_id_idx on public.import_items (user_id, job_id);

alter table public.profiles enable row level security;
alter table public.tags enable row level security;
alter table public.pages enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.interruptions enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_items enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profiles_delete_own" on public.profiles
for delete to authenticated
using ((select auth.uid()) = id);

create policy "tags_select_own" on public.tags
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "tags_insert_own" on public.tags
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "tags_update_own" on public.tags
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tags_delete_own" on public.tags
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "pages_select_own" on public.pages
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "pages_insert_own" on public.pages
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "pages_update_own" on public.pages
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "pages_delete_own" on public.pages
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_select_own" on public.tasks
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_insert_own" on public.tasks
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "tasks_update_own" on public.tasks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tasks_delete_own" on public.tasks
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "focus_sessions_select_own" on public.focus_sessions
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "focus_sessions_insert_own" on public.focus_sessions
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "focus_sessions_update_own" on public.focus_sessions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "focus_sessions_delete_own" on public.focus_sessions
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "interruptions_select_own" on public.interruptions
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "interruptions_insert_own" on public.interruptions
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "interruptions_update_own" on public.interruptions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "interruptions_delete_own" on public.interruptions
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "import_jobs_select_own" on public.import_jobs
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "import_jobs_insert_own" on public.import_jobs
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "import_jobs_update_own" on public.import_jobs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "import_jobs_delete_own" on public.import_jobs
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "import_items_select_own" on public.import_items
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "import_items_insert_own" on public.import_items
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "import_items_update_own" on public.import_items
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "import_items_delete_own" on public.import_items
for delete to authenticated
using ((select auth.uid()) = user_id);
