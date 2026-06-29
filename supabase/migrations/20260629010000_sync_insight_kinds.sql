-- Synchronize lockin_ai_insight_kind enum with every AIInsightKind used by the frontend.
-- Uses ADD VALUE IF NOT EXISTS so it is safe to run even if some values already exist
-- (from the earlier 20260629000000_ai_workflows.sql migration).

ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'smart_planner';
ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'daily_review';
ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'task_breakdown';
ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'burnout_detection';
ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'prioritization';
ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'productive_hours';
ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'distraction_patterns';
ALTER TYPE public.lockin_ai_insight_kind ADD VALUE IF NOT EXISTS 'session_plan';
