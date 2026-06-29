create type public.lockin_ai_insight_kind as enum (
  'dashboard',
  'session_plan',
  'session_reflection',
  'weekly_report',
  'distraction_patterns',
  'productive_hours',
  'task_summary',
  'recommendation'
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind public.lockin_ai_insight_kind not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  summary text not null check (char_length(btrim(summary)) between 1 and 4000),
  recommendations jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  related_session_id uuid,
  related_task_id uuid,
  source_start timestamptz,
  source_end timestamptz,
  provider text not null default 'sarvam' check (char_length(provider) between 1 and 80),
  model text not null default 'sarvam-30b' check (char_length(model) between 1 and 120),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint ai_insights_session_owner_fk foreign key (user_id, related_session_id)
    references public.focus_sessions(user_id, id) on delete set null (related_session_id),
  constraint ai_insights_task_owner_fk foreign key (user_id, related_task_id)
    references public.tasks(user_id, id) on delete set null (related_task_id),
  constraint ai_insights_recommendations_array_check check (jsonb_typeof(recommendations) = 'array'),
  constraint ai_insights_evidence_object_check check (jsonb_typeof(evidence) = 'object')
);

create trigger ai_insights_set_updated_at
before update on public.ai_insights
for each row execute function public.set_updated_at();

create index if not exists ai_insights_user_id_kind_generated_at_idx on public.ai_insights (user_id, kind, generated_at desc);
create index if not exists ai_insights_user_id_generated_at_idx on public.ai_insights (user_id, generated_at desc);
create index if not exists ai_insights_user_id_related_session_id_idx on public.ai_insights (user_id, related_session_id) where related_session_id is not null;
create index if not exists ai_insights_user_id_related_task_id_idx on public.ai_insights (user_id, related_task_id) where related_task_id is not null;

create unique index if not exists ai_insights_one_reflection_per_session_idx
on public.ai_insights (user_id, related_session_id, kind)
where kind = 'session_reflection' and related_session_id is not null;

alter table public.ai_insights enable row level security;

create policy "ai_insights_select_own" on public.ai_insights
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "ai_insights_insert_own" on public.ai_insights
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "ai_insights_update_own" on public.ai_insights
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "ai_insights_delete_own" on public.ai_insights
for delete to authenticated
using ((select auth.uid()) = user_id);
