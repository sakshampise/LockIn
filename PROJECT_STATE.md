# PROJECT_STATE

## Completed Work

### Break Planner Redesign (post-optimization pass)

**New file: `src/lib/breakPlanner.ts` — single source of truth for break scheduling.**
- Implements evidence-based break algorithm: ≤20 min → no breaks; 21–45 min → 1×5m break; 46–90 min → 1×10m break; 91–150 min → 2 breaks; >150 min → 3 breaks with a long break mid-session.
- Returns `SessionPlan` with `focusBlocks[]`, `breaks[]`, `totalMinutes`, `recommendationText`, and `estimatedFinish(start?)`.
- `getActivePhase(plan, elapsedSeconds)` drives the running timer — tells the UI whether it is in a focus block or a break, seconds remaining in the phase, and what comes next.
- Deterministic: same inputs always produce the same output.

**Redesigned ContextPanel (`src/components/layout/ContextPanel.tsx`) — session planner.**
- Timer tab renamed "Session". New `SessionPlanner` component shows:
  - **Focus Time**: inline editable number with preset chips (25/45/60/90/120m).
  - **Breaks**: Auto / Off two-state toggle (no breakduration/count controls exposed).
  - **Session Plan** preview card: ordered focus blocks and breaks with labels, updates instantly.
  - **Estimated Finish** chip: wall-clock finish time including breaks.
  - **Focus on**: current page (first, highlighted) plus up to 4 active tasks — clicking any starts the session immediately.
- No configuration is exposed during an active session; active state shows session title, duration, and "Open timer →" link.

**Refactored `AppProvider.startFocus` signature.**
- Old: `startFocus(targetId, targetType, title, presetId?, config?)`.
- New: `startFocus(targetId, targetType, title, durationMinutes, breakMode)`.
- `StoredSessionPlan { focusDurationMinutes, breakMode }` added to `AppState.activeFocusSessionPlan`.
- Plan is stored on start, cleared on end — FocusMode can always reconstruct the exact plan that was shown in the sidebar.

**Rewritten FocusMode (`src/features/focus/FocusMode.tsx`).**
- No local config state — reads `state.activeFocusSessionPlan` and calls `buildSessionPlan()` to reconstruct the exact plan.
- `getActivePhase()` called every tick to determine if the user is in a focus block or a break.
- Ring timer shows phase-local progress (focus progress vs break countdown).
- Timer display shows phase-remaining seconds, not total session countdown.
- Next break hint shown during focus blocks ("Break at 12m").
- "Focus resumes in X:XX" shown during breaks.
- Motivational messages cycle naturally based on overall session progress.
- No configuration controls on the running screen.

**Updated all `startFocus` callers.**
- `Tasks.tsx`: `startFocus(id, 'task', title, 25, 'auto')`.
- `Workspace.tsx`: `startFocus(id, 'page', title, 25, 'auto')`.
- `ContextPanel.tsx`: passes the user-configured `durationMinutes` and `breakMode`.

**Build: `npm run build` → success, zero TypeScript errors.**

- Hardened the AI infrastructure continuation pass after the previous timeout.
- Fixed `ai-coach` Edge Function CORS headers with explicit `POST, OPTIONS` support and `Vary: Origin`.
- Fixed the AI insight service so manual AI generation respects the AI availability switch and does not call an unavailable Edge Function when disabled.
- Changed AI feature gating so deployed environments are enabled by default unless `VITE_AI_COACH_ENABLED=false` is explicitly set.
- Set local `.env.local` to `VITE_AI_COACH_ENABLED=false` because the connected remote Edge Function is not deployed yet, preventing broken local AI calls while backend deployment is blocked.
- Re-verified Supabase REST table exposure: `profiles`, `tasks`, `pages`, `tags`, `focus_presets`, `focus_sessions`, and `interruptions` return 200; `ai_insights` and `workflow_runs` still return 404 until pending migrations are applied.
- Attempted remote migration deployment with Supabase CLI; blocked because the repo is not linked and no DB URL/password or `SUPABASE_ACCESS_TOKEN` is available.
- Attempted `ai-coach` Edge Function deployment; blocked because no `SUPABASE_ACCESS_TOKEN` is available.
- Verified the remote `ai-coach` endpoint currently returns 404 for CORS preflight, confirming the function is not deployed in the connected project.
- Added Render workflow infrastructure files for scheduled AI insight generation with workflow run tracking, idempotency, retries, logs, and status updates.
- Added optional Neo4j graph sync infrastructure that can be run separately and safely remains absent from the frontend runtime.
- Improved scroll behavior in modals, Tasks, Analytics, and Notion Import so content can scroll inside the fixed app shell.
- Improved Tasks typing performance by keeping task title and description edits local until blur or Enter instead of writing through app state/Supabase on every keystroke.
- Verified no authored `src` files contain `console.*` calls.
- Verified no leftover user-facing Focus preset selection/create/delete controls were found.
- Verified the TypeScript production build succeeds after AI infrastructure and UX hardening.
- Verified `git diff --check` passes, with only expected Windows LF-to-CRLF notices.
- Confirmed the connected Supabase REST API currently returns 404 for required tables because migrations have not been applied to the remote project.
- Parsed the configured Supabase project ref from `.env.local`.
- Verified `.env.local` contains only browser-safe Supabase URL/anon key values, not deploy-capable database credentials.
- Checked for local Supabase CLI, linked project metadata, cached Supabase token, `psql`, Docker, and deploy-capable environment variables; none were available.
- Attempted to invoke the Supabase CLI via npm package execution, but the command timed out before a usable CLI became available.
- Inspected the authored repository structure, live React source, project config, and legacy backup prototype before making changes.
- Identified the current app as a Vite + React + TypeScript frontend using seeded mock state and `localStorage`.
- Installed the Supabase browser client dependency.
- Added a Supabase environment contract in `.env.example`.
- Added typed Vite environment declarations.
- Added a fail-fast public environment helper.
- Added the initial typed Supabase browser client.
- Added backend-facing project folders for future auth/data services and Supabase migrations.
- Verified the TypeScript production build succeeds after the Supabase setup.
- Designed and implemented the initial Supabase PostgreSQL schema migration.
- Added normalized tables for profiles, tags, pages, tasks, focus sessions, interruptions, import jobs, and import items.
- Added enum types for task priority, recurrence, theme, focus target type, import source, import status, and import item type.
- Added owner-scoped foreign keys, cascade rules, check constraints, timestamps, update triggers, and indexes.
- Enabled Row Level Security on all user-owned tables.
- Added authenticated owner CRUD policies for every user-owned table.
- Replaced placeholder Supabase TypeScript database types with schema-aligned table, enum, and relationship types.
- Verified the TypeScript production build succeeds after the schema typing update.
- Performed static migration coverage checks for table creation, RLS, policies, indexes, and triggers.
- Implemented Supabase Authentication provider and auth service layer.
- Added user registration, login, logout, password reset email, and recovered-password update flow.
- Added session persistence via Supabase `getSession` and `onAuthStateChange`.
- Added a protected app gate so unauthenticated users must authenticate before entering the workspace.
- Added minimal auth UI using the existing LockIn card, input, button, typography, and dark visual language.
- Added an account/sign-out section to Settings.
- Added a migration for automatic profile creation after signup using an `auth.users` trigger.
- Added default focus preset creation for new users.
- Added backend support for customizable focus presets with RLS, owner policies, constraints, indexes, and timestamps.
- Extended tasks with descriptions for future task notes.
- Extended focus session history with preset linkage, planned duration, actual duration, interruption count, and normalized completion status.
- Updated Supabase TypeScript database types for the auth/focus schema additions.
- Verified the TypeScript production build succeeds after auth integration.
- Performed static migration checks for profile trigger, focus preset RLS/policies, task notes, and richer focus session history fields.
- Replaced the local reducer/localStorage application store with a Supabase-backed workspace provider.
- Added production data services for user profiles, pages, tasks, focus presets, focus sessions, interruptions, and dashboard statistics.
- Connected Dashboard, Tasks, Focus, Analytics, Settings, Sidebar, Context Panel, recent notes, session history, and activity surfaces to authenticated user data loaded from Supabase.
- Implemented live task create, edit, delete, complete/incomplete, priority, due date, recurrence, description, reorder, and focus-session assignment behavior.
- Implemented live focus preset create, edit, delete, and selection behavior.
- Implemented focus session start/end persistence, including preset linkage, task/page linkage, actual duration, interruption count, and completion/interruption status.
- Added profile and default focus-preset fallback creation for existing/legacy authenticated users.
- Removed obsolete mock seed data and the old backup prototype that contained hardcoded datasets.
- Verified no authored application files still reference the old seed/localStorage/mock datasets.
- Verified the TypeScript production build succeeds after the Supabase data-layer conversion.
- Fixed the Settings page layout so the full page scrolls inside the app shell.
- Hardened Settings profile and focus default updates so values are edited locally and persisted to Supabase on blur or Enter instead of sending invalid transient values.
- Removed detailed focus preset editing from Settings so users do not need to open Settings to configure focus sessions.
- Moved focus preset creation, editing, deletion, and selection into the Focus start experience while preserving the existing glass-panel design language.
- Added Focus controls for duration, number of breaks, short break duration, long break duration, and sessions before a long break, all persisted through the existing Supabase focus preset service.
- Kept at least one focus preset available by disabling deletion when only one preset remains.
- Confirmed task management remains connected to live Supabase persistence for add, edit, delete, complete, priority, due date, description, recurrence, reorder, and focus assignment.
- Confirmed dashboard and focus statistics continue to derive from live task and focus session state.
- Verified the TypeScript production build succeeds after the usability fixes.
- Investigated Workspace editor typing lag and traced it to per-keystroke global context updates plus Supabase page writes.
- Optimized Workspace page editing with local title/content draft state, debounced autosave, immediate flush on blur/page switch/focus start, and memoized page tree/slash-command derivations.
- Verified the TypeScript production build succeeds after the Workspace performance fix.
- Completed Phase 1 core product polish for the hackathon optimization plan.
- Replaced the user-facing Focus preset workflow with a single editable Focus configuration on the Focus page while continuing to persist values through Supabase `focus_presets`.
- Fixed Focus session start so the running timer uses the exact configuration snapshot shown before start, including edits made without blurring the field.
- Kept the running Focus screen distraction-free and moved configuration to the pre-start state only.
- Required an interruption reason before ending a focus session early and continued storing the reason in `interruptions.reason`.
- Added interruption reason summaries and interrupted-session reason details to Analytics.
- Added production-quality loading, retryable error, and empty states across the app shell, Dashboard widgets, Workspace page list, Tasks, and Analytics.
- Removed the remaining auth-session console error logging path and verified no `console.*` calls remain in authored `src` files.
- Verified no direct Workspace page title/content edits write through `updatePage` on every keystroke.
- Verified the TypeScript production build succeeds after Phase 1 core polish.
- Completed Phase 2 AI Productivity Coach implementation for the hackathon optimization plan.
- Added a Supabase migration for user-owned `ai_insights` with RLS, owner policies, timestamps, indexes, session/task relationships, structured recommendations, evidence metadata, provider/model fields, and confidence scoring.
- Added schema-aligned TypeScript types for AI insight rows and application-level `AIInsight` objects.
- Added a secure Supabase Edge Function, `ai-coach`, that authenticates the user, gathers workspace context server-side, calls Sarvam AI with server-only credentials, stores generated insights, and returns saved results.
- Added AI dashboard coaching with saved summaries, actionable recommendations, refresh/generate states, and empty states.
- Added AI session planning to the Focus pre-start flow without adding distractions to the running timer.
- Added AI task summaries to the Tasks page.
- Added AI weekly productivity reports, distraction-pattern analysis, productive-hour analysis, and session reflections to Analytics.
- Added automatic AI session reflection generation after a focus session ends, using prior insights as memory context for future coaching.
- Documented server-only Sarvam AI environment variables in `.env.example`.
- Verified the TypeScript production build succeeds after Phase 2 AI integration.
- Verified schema synchronization requirements after the frontend began reading `ai_insights`.
- Confirmed required local migrations now exist for the current implementation: initial app schema, auth/focus presets, AI productivity coach, and workflow run tracking.
- Added the missing `workflow_runs` migration with status enum, idempotency key, retry counters, logs, metadata, timestamps, indexes, RLS, and owner policies.
- Updated Supabase TypeScript database types for `workflow_runs` and `lockin_workflow_run_status`.
- Hardened the AI insight data service so missing optional `ai_insights` REST resources degrade to an empty insight list instead of breaking workspace load with REST 404 errors.
- Verified the connected Supabase REST API exposes existing core tables: `profiles`, `tasks`, `pages`, `tags`, `focus_sessions`, `focus_presets`, and `interruptions`.
- Verified the connected Supabase REST API still returns 404 for pending tables: `ai_insights` and `workflow_runs`.
- Verified local migration coverage for AI/workflow tables, indexes, triggers, and RLS policies by static inspection.
- Verified the TypeScript production build succeeds after the schema synchronization safeguards.
- Attempted Supabase CLI project access; remote migration application is blocked because no `SUPABASE_ACCESS_TOKEN`, database URL, or database password is available locally.

### Hackathon Optimization Pass — All Phases Complete

**Phase 1 — Focus Mode & UX hardening:**
- Added inline break enable/disable toggle directly in the Focus pre-start configuration.
- Added automatic break schedule computation and preview (slots shown before starting session).
- Added upcoming break hint during the active timer ("Break at 12m").
- Added motivational/progress messages that update at 25%, 50%, 75%, 95% completion.
- Fixed broken encoding artifacts in Tasks page subtitle (`Â·`) and placeholder (`â€¦`).
- Memoized expensive analytics derivations in FocusMode, Dashboard, and Analytics.
- Added `useMemo` to FocusMode for `normalizedConfig`, `breakSlots`, `sessionPlan`, `streak`, `todayMin`, `nextBreak`.

**Phase 2 — Demo Mode:**
- Created `src/lib/demoData.ts` with realistic hackathon-themed sample data: 24 focus sessions over 3 weeks, 8 tasks, 4 pages, 3 interruptions, and 5 pre-generated AI insights.
- Demo data is gate-controlled by `VITE_DEMO_MODE=true` environment variable.
- Demo data merges non-destructively with real Supabase data when real data is sparse (< 3 completed sessions).
- Never bypasses authentication — demo data supplements real workspace data.
- Added `isDemoMode()` helper in `src/lib/demoData.ts`.
- Added amber "Demo" badge to Dashboard header when demo mode is active.

**Phase 3 — Expanded Analytics:**
- Added `getBurnoutRisk()` → `'low' | 'medium' | 'high'` composite metric in analytics lib.
- Added `getWeeklyBarData()` for 7-day animated bar chart in analytics lib.
- Added `getStreakCalendar()` for month-view streak calendar in analytics lib.
- Added `getProductiveHours()` for per-hour minute distribution in analytics lib.
- Rewrote Analytics page with: burnout risk indicator, weekly SVG bar chart, streak calendar, bar chart interruption visualization, pinned AI recommendations card, AI report cards with confidence badge + relative time.

**Phase 4 — AI Coach improvements:**
- Enhanced `AICoachWidget` with confidence score badge, relative generation time, expandable recommendations, and coaching history section showing previous insight titles.

**Phase 4b — Dashboard improvements:**
- Added `BurnoutBadge` to Dashboard greeting header (memoized, inline).
- Memoized `FocusHeatmap` data derivations.

**Phase 5 — Render Workflow hardening:**
- Rewrote `generate-ai-insights.mjs` with: per-kind retry + exponential back-off, `--dry-run` mode, structured JSON logs appended to `workflow_runs`, graceful table-absent degradation, daily/weekly mode selection via `LOCKIN_WORKFLOW_MODE`.
- Added `workflow:weekly` and `workflow:dry-run` npm scripts.
- Updated `render.yaml` to add a second weekly cron job (`0 3 * * 0`) for weekly AI report + Neo4j sync.

**Phase 6 — Neo4j hardening:**
- Enhanced `sync-neo4j.mjs` with: `Tag` nodes, `Page→Tag`, `Task→Page`, `AIInsight→Session/Task` relationships, batched transaction statements per entity, structured JSON logs, graceful credential-absent exit.
- Added missing `LOCKIN_GRAPH_USER_ID` env to weekly Render job.

**Build verification:**
- `npm run build` → succeeded, zero TypeScript errors, 621 kB bundle (chunk size warning only).
- Zero authored `console.*` calls in `src/`.

## Current Milestone

All six hackathon optimization phases implemented and build-verified.

Status: Locally complete and build-verified. Remote deployment still blocked by missing privileged Supabase credentials.

## Remaining Milestones

- Remote deployment: apply `ai_insights` and `workflow_runs` migrations via Supabase SQL Editor, then deploy `ai-coach` Edge Function via Supabase dashboard. No credentials are required beyond web dashboard access.
- Set `VITE_AI_COACH_ENABLED=true` in production deployment after function is live.
- Set `VITE_DEMO_MODE=true` in the judging deployment if real focus history is sparse.
- Connect Render account to deploy the two cron services from `render.yaml`.
- Provide Neo4j AuraDB credentials if the graph bonus track is desired.

## Known Issues

- AI features are implemented and enabled by default for deployed environments, but local `.env.local` explicitly sets `VITE_AI_COACH_ENABLED=false` until the remote `ai-coach` function and `ai_insights` table are deployed.
- Remote deployment still requires one of: `SUPABASE_ACCESS_TOKEN` plus project link/DB password, a direct Postgres connection string with DDL privileges, or manual execution of the pending SQL migrations in Supabase SQL Editor.
- The remote `ai-coach` Edge Function is not deployed; preflight currently returns 404 from the connected Supabase project.
- Remote core schema is deployed and REST-exposed for `profiles`, `tasks`, `pages`, `tags`, `focus_presets`, `focus_sessions`, and `interruptions`. Pending AI/workflow tables still return REST 404: `ai_insights` and `workflow_runs`.
- Applying pending migrations requires one of the following: `SUPABASE_ACCESS_TOKEN` plus database password, a direct Postgres connection string with DDL privileges, or manually running the pending SQL in Supabase SQL Editor. Only the public anon key is available locally.
- Public Supabase browser credentials are present in `.env.local`; privileged deploy credentials are not present locally.
- The Notion import screen is still a preview flow with no parser or API integration.
- `npm install` reported 1 moderate and 1 high dependency vulnerability; dependency remediation is reserved for the production hardening milestone unless it blocks earlier work.
- The existing `npm run lint` script fails because the repository does not yet include an ESLint configuration file.
- The Supabase CLI, `psql`, and Docker are not available locally, so the migration has not yet been applied to a live/local Postgres instance. Run `supabase db reset` or apply the migration in Supabase to complete database-level validation.
- Supabase credentials are still absent locally, so real end-to-end signup/login/logout/password-reset testing could not be performed in this workspace. The auth flow is implemented and build-verified, but it must be tested against a configured Supabase project.
- Real end-to-end data operations could not be tested against Supabase in this workspace because credentials and database tooling are unavailable. The data layer is implemented and build-verified, but live CRUD/session testing must be performed against a configured Supabase project.
- The Vite production build now warns that the main JavaScript chunk is larger than 500 kB after adding Supabase Auth. Code splitting can be handled during the production hardening milestone.
- Browser console verification was not performed in this Phase 1 pass. Build verification passed, `git diff --check` passed, authored `src` files were scanned for `console.*`, and Workspace was scanned for direct per-keystroke page persistence.
- Focus configuration is now managed as a single user-facing configuration in the Focus start experience; Settings only contains account/profile/default preference controls.
- Sarvam AI support is implemented through a Supabase Edge Function, but live AI calls require deploying the function and setting `SARVAM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and standard Supabase function env vars.

## Architectural Decisions

- AI feature visibility is controlled by `VITE_AI_COACH_ENABLED`; the deployed default is enabled unless explicitly set to `false`, while local development can disable unavailable backend calls during schema/function rollout.
- Scrollable page-level views must opt into `min-h-0 overflow-y-auto` because the premium desktop shell intentionally owns the viewport and hides outer overflow.
- Task title and description editing follows the Workspace draft-save pattern to keep typing responsive and avoid Supabase writes on every keystroke.
- Supabase public URL and anon key are read from `VITE_` environment variables for browser use.
- Service-role secrets are documented as server-only and are not referenced by frontend code.
- The Supabase client is isolated under `src/lib/supabase` so later auth and data services can depend on it without coupling UI components directly to setup details.
- The database uses `profiles` as the user-owned settings root keyed to `auth.users`.
- Page tags are normalized into a `tags` table, while pages retain optional icon and JSON metadata for future UI flexibility.
- Pages use a self-referential parent relationship scoped by `(user_id, id)` so nested pages cannot cross user boundaries.
- Tasks optionally link to pages and enforce a consistent `done`/`completed_at` state.
- Focus sessions keep a `target_title` snapshot for analytics/history even if a linked page or task is later deleted.
- Import jobs and import items are included to support the visible Notion import flow without wiring it yet.
- All user-owned tables use explicit authenticated owner CRUD policies and `auth.uid()` defaults for insert ownership where appropriate.
- Authentication is implemented as a root `AuthProvider` plus `AuthGate`, so the existing app shell remains protected without introducing a router.
- Supabase Auth remains the source of truth for sessions; app data is still local until later data milestones.
- Profile creation is handled primarily by a database trigger on `auth.users`, with a client-side `ensureUserProfile` fallback after sign-in/session restoration.
- Password reset supports both sending the reset email and setting a new password after Supabase returns the user in a recovery session.
- Focus presets are modeled as user-owned rows so future UI can create, edit, delete, reorder, and sync presets across devices.
- Focus session history stores both linked records and snapshots/metrics so future analytics remain stable if a task, page, or preset changes.
- The app now loads user-owned Supabase data once at workspace mount and applies optimistic local updates for mutations, rolling back on errors.
- The provider remains the compatibility boundary for existing UI components, keeping the visual shell stable while replacing the data source.
- Dashboard and analytics values are derived from live tasks and focus sessions, not persisted counters.
- Milestone 4 intentionally absorbed the original mock-data replacement and live-screen connection work because the user requested those objectives in this milestone.
- Existing UI, navigation, animations, and local state behavior were left unchanged for Milestone 1.
- Existing UI, navigation, animations, and local state behavior were left unchanged for Milestone 2.
- Existing UI, navigation, animations, and layout were preserved for Milestone 3 except for the required auth gate and Settings account controls.
- Existing UI, navigation, animations, and layout were preserved for Milestone 4 except for minimal task metadata controls and focus preset management required for backend functionality.
- Settings uses local draft state for editable preferences and commits valid values to Supabase on blur/Enter to avoid failed writes while a user is typing.
- Focus configuration now belongs to the Focus start flow because it is part of starting a session, while account/profile defaults remain in Settings.
- The `focus_presets` table remains the internal persistence table for Focus configuration, but the user-facing preset selection/create/delete workflow has been removed.
- Starting a Focus session accepts a configuration snapshot so the persisted session duration and visible pre-start timer cannot diverge.
- Early-ended Focus sessions are treated as interruptions and require a stored reason for future analytics.
- App-level recoverable data errors are shown as retryable in-shell banners instead of only being invisible state.
- Workspace page editing now uses local draft state with debounced Supabase persistence so typing does not update global app context or perform network writes on every keystroke.
- AI insights are persisted as user-owned Supabase rows and surfaced through the existing app provider so coaching remains available after refresh and can become memory for future prompts.
- Sarvam AI is called only from the `ai-coach` Edge Function; no AI provider secret is exposed through Vite or frontend code.
- Session reflections are generated asynchronously after `endFocus` succeeds so the core timer flow stays responsive even if AI generation fails or is unavailable.
- AI insights are treated as optional during schema rollout: if `ai_insights` is absent remotely, the frontend shows empty AI states instead of failing the entire workspace load.
- `workflow_runs` is now modeled ahead of Render Workflows so scheduled infrastructure can track idempotency, retries, execution status, logs, and metadata once Phase 3 begins.
- Demo mode is controlled by `VITE_DEMO_MODE=true` and merges realistic hackathon-themed sample data non-destructively with real Supabase data when real completed sessions < 3. Authentication is never bypassed.
- Break scheduling is computed from the focus configuration snapshot at start time, not from live preset state, to guarantee the timer exactly matches what was visible before Start.
- Burnout risk is a composite of session frequency drop, interruption spike rate, and overdue task fraction; it is computed client-side from existing state with no extra network calls.
- Render workflow degradation: if `workflow_runs` table is absent, the workflow still generates insights but skips run-tracking rather than failing entirely.

## Hackathon Judging Impact

- Phase 1 improves product completeness, demo confidence, UX polish, data reliability, and perceived production readiness.
- The core demo now better demonstrates real user value through smooth writing, clear focus setup, interruption tracking, and meaningful analytics states.
- Phase 2 improves AI depth, demo differentiation, technical architecture, and real user value by turning workspace data into planning, summaries, reflections, pattern analysis, and recommendations.
- Sarvam AI sponsor support is now implemented because AI coaching is a core product capability backed by secure server-side Sarvam API calls.
- Hackathon optimization pass adds: break scheduling in Focus, motivational messages, demo mode for judging confidence, burnout risk indicator, weekly bar chart, streak calendar, improved AI coach widget with confidence + time, hardened Render workflows with retry and dry-run, enhanced Neo4j graph with richer relationships.
- Phase 3 Notion Import: fully offline `.zip` ZIP parser with markdown parsing, checkboxes converting to native tasks, and maintaining page hierarchy directly in the browser via `jszip` and recursive processing.
- Context Panel Redesign: transformed the legacy right sidebar into a dynamic compact session planner and live monitor powered by:
- Focus presets
- Supabase data layer
- RLS schema
- Migrations
- AuthProvider
- Service layer
- Context Panel single source of truth for scheduling
- AI Provider Architecture (`SarvamProvider` and `LocalInsightsProvider`)
- Notion ZIP Import Parser

## Current Backend Status

- Core schema exists locally through migrations.
- AI migrations exist locally.
- Workflow migrations exist locally.
- Render configuration exists.
- Supabase Edge Function (`ai-coach`) acts as a secure proxy for Sarvam AI.
