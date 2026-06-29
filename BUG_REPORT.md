# LockIn Bug Report & QA Status

This document summarizes the bugs discovered and resolved during the end-to-end architecture verification phase. 

## 🐞 Bugs Found & Fixed

### 1. Frontend Bypassing Queue Architecture
- **Issue**: The `Tasks.tsx` component was still orchestrating `task_summary` and `task_breakdown` by directly triggering Edge Function invocations instead of pushing jobs to the queue.
- **Fix**: Ripped out all frontend remote-generation logic. Added `enqueueTaskBreakdown` and `enqueueTaskSummary` to `enqueueService.ts`. Updated `Tasks.tsx` to insert these jobs into `workflow_runs` and let the UI reactively render results when the background worker finishes. 

### 2. Provider Abstraction Pollution
- **Issue**: `aiInsightService.ts` was still attempting to load `SarvamProvider` inside the browser, maintaining complex logic for remote LLM retries and edge function routing.
- **Fix**: Removed `sarvamProvider.ts` from the frontend completely. Refactored `aiInsightService.ts` to *only* accept deterministic, local insights (`smart_planner`, `prioritization`, etc.). Attempting to generate a remote insight locally now throws an explicit Error to prevent regression.

### 3. Edge Function Unauthorized Execution Vulnerability
- **Issue**: The `ai-coach` Edge Function was validating client JWT tokens as a fallback if the service role key wasn't provided. This meant a malicious client could bypass the queue and hit the LLM directly, causing unwanted billing charges and bypassing worker rate limits.
- **Fix**: Removed the entire JWT fallback block. The Edge Function now **strictly validates** a shared `X-Worker-Secret` header. Only the Render worker is authorized to communicate with it.

### 4. Missing Background Handlers
- **Issue**: When `task_summary` and `task_breakdown` were moved to the queue, the Render worker did not actually have job handlers written for them.
- **Fix**: Created `worker/src/jobs/taskBreakdown.ts` and `worker/src/jobs/taskSummary.ts`. Appended them to the worker's `registry.ts`. The worker now fully understands and processes these jobs.

### 5. TypeScript Strictness Failures
- **Issue**: Various unused imports (`Database` in enqueue service) and incorrect function signatures surfaced during the migration.
- **Fix**: Ran a strict `tsc` compilation pass on both the frontend and the worker, fixing every warning and error until `0 errors` were achieved.

## ⚠️ Known Issues / Limitations
1. **Render Free Tier Cold Starts**: If deploying the worker to a free Render instance, it will spin down after 15 minutes of inactivity. When a Supabase Webhook hits it, the first request will take ~50s to wake the server, resulting in a slightly delayed UI update for the very first action of the day.
2. **Ghost Jobs**: If the worker process crashes abruptly (e.g. out of memory, or server restart) while a job is in `processing` state, it cannot mark the job as `failed`. The `/cron/cleanup` endpoint has been provided to automatically sweep these "ghost jobs" back to the queue or mark them failed, but requires a cron trigger setup in Render.

## ✅ Final Status
The repository is completely clean. There are no placeholder values, mocked data, leftover `setTimeout` mock routines, or `console.log` debug spam remaining. LockIn is **Production-Ready**.
