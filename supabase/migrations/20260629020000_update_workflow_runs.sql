-- 20260629020000_update_workflow_runs.sql

-- Add new enum values if they don't exist
ALTER TYPE public.lockin_workflow_run_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE public.lockin_workflow_run_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.lockin_workflow_run_status ADD VALUE IF NOT EXISTS 'retrying';
ALTER TYPE public.lockin_workflow_run_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE public.lockin_workflow_run_status ADD VALUE IF NOT EXISTS 'dead_letter';



-- Add new columns to the table
ALTER TABLE public.workflow_runs 
ADD COLUMN IF NOT EXISTS worker_id text,
ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- Update the check constraint to support the new completion statuses
ALTER TABLE public.workflow_runs DROP CONSTRAINT IF EXISTS workflow_runs_completion_check;

ALTER TABLE public.workflow_runs ADD CONSTRAINT workflow_runs_completion_check check (
  (status in ('completed', 'failed', 'cancelled', 'dead_letter') and finished_at is not null)
  or (status in ('queued', 'processing', 'retrying', 'scheduled'))
);
