create type public.lockin_workflow_run_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workflow_name text not null check (char_length(btrim(workflow_name)) between 1 and 120),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 1 and 200),
  status public.lockin_workflow_run_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  last_error text check (last_error is null or char_length(last_error) <= 2000),
  logs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, workflow_name, idempotency_key),
  constraint workflow_runs_logs_array_check check (jsonb_typeof(logs) = 'array'),
  constraint workflow_runs_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint workflow_runs_completion_check check (
    (status in ('succeeded', 'failed', 'cancelled') and completed_at is not null)
    or (status in ('queued', 'running'))
  )
);

create trigger workflow_runs_set_updated_at
before update on public.workflow_runs
for each row execute function public.set_updated_at();

create index if not exists workflow_runs_user_id_status_created_at_idx on public.workflow_runs (user_id, status, created_at desc);
create index if not exists workflow_runs_user_id_workflow_name_created_at_idx on public.workflow_runs (user_id, workflow_name, created_at desc);

alter table public.workflow_runs enable row level security;

create policy "workflow_runs_select_own" on public.workflow_runs
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "workflow_runs_insert_own" on public.workflow_runs
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "workflow_runs_update_own" on public.workflow_runs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "workflow_runs_delete_own" on public.workflow_runs
for delete to authenticated
using ((select auth.uid()) = user_id);
