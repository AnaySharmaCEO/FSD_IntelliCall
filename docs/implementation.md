# implementation.md: How We Implement the Next Phase Plan

**Read after:** `docs_index.md`, `FRONTEND_SPEC.md`, `frontend_update.md`, `backend_update.md`  
**Audience:** The development team. This file answers "how do we actually execute the plan in code, given our existing project?"

---

## 0. State of the Project Right Now

| Layer | What exists | What's needed |
|---|---|---|
| **Frontend** | React 19 + Vite 8 + React Router v7 + Tailwind 4. Custom components (Button, Sidebar, Topbar, Modal, Drawer, FilterBar, etc.). Full Supabase auth (`AuthContext`). Pages for Dashboard, Leads, Campaigns, Agents, Calls, Decisions, Outcomes, Strategies, Settings, Auth, Onboarding. Hooks calling Supabase directly. | New architecture seams (ApiClient/RealtimeClient/VoiceSessionClient/AuthAdapter), TanStack Query, shadcn/ui, Zod contracts, mock layer, new screens from the spec, complete feature set |
| **Backend (Supabase)** | 7 migrations live on cloud project (profiles, organizations, organization_members, leads, agents, campaigns, calls, transcripts, decisions, etc.). 4 Edge Functions (handle-call-webhook, handle-appointment-webhook, process-ai-decision, trigger-scheduled-calls). | New `api` Edge Function (Hono), renamed/refactored functions, additional tables (review_items, appointments, tasks, jobs, notifications, audit_logs, etc.), full RLS coverage, policy engine, analysis pipeline |
| **Backend (Python)** | Does not exist yet | voice-agent (LiveKit), resonology-ai (FastAPI) |

---

## 1. Execution Order (Big Picture)

```
B0 Audit ──────────────────────────────────────────────────────► (blocking gate)
    │
    ▼
F0 Frontend Audit + Branch ────────────────────────────────────► (blocking gate: show MIGRATION_MAP.md)
    │
    ├── F1 Foundation + Design System ─────────────────────────► (parallel with B1)
    │       ↓
    │   F2 Port 9 reference screens ──────────────────────────►
    │       ↓
    │   F3 Remaining screens + modals ────────────────────────►
    │
    ├── B1 Foundation (api skeleton, org/auth/me) ─────────────► Switch auth domain to API
    │       ↓
    │   B2 Leads ─────────────────────────────────────────────► Switch leads
    │       ↓
    │   B3 Agents ────────────────────────────────────────────► Switch agents
    │       ↓
    │   B4 Campaigns + Compliance ────────────────────────────► Switch campaigns
    │       ↓
    │   B5 Calls ─────────────────────────────────────────────► Switch calls
    │       ↓
    │   B6 Intelligence (AI pipeline) ───────────────────────► Switch review queue
    │       ↓
    │   B7 Scheduling (appointments, tasks) ─────────────────► Switch appointments
    │       ↓
    │   B8 Analytics + Platform ──────────────────────────────► Switch dashboard/insights
    │
    └── Voice + AI services (Python) ──────────────────────────► After B5 is done

F4 Retire legacy-src ──────────────────────────────────────────► After F3 + all domains switched
F5 Final swap to real data ─────────────────────────────────────► After B9
```

---

## 2. Phase B0 — Backend Audit (Start Here)

**Who:** Backend developer  
**Output:** `docs/backend/AUDIT.md`  
**Blocking:** All backend phases. Do not write any new migration until this is done.

### What to audit:

**Existing migrations** (read each file in `supabase/migrations/`):

| Migration | What it creates |
|---|---|
| `20260907000001_foundation.sql` | `profiles`, `organizations` (with `slug`), `organization_members` (role, status), `is_org_member()` function |
| `20260907000002_core_schema.sql` | `lead_status`, `agent_status`, `campaign_status`, `call_status` enums; `agents`, `campaigns`, `leads`, `campaign_leads`, `lead_status_history`, `calls`, `transcripts`, `transcript_turns`, `decisions`, `evidence_signals`, `actions`, `outcomes`, `appointments`, `follow_ups`, `audit_log` tables |
| `20260907000003_rls_policies.sql` | RLS on all tables above |
| `20260907000004_triggers.sql` | `touch_updated_at` trigger on all tables |
| `20260907000005_storage.sql` | `call-recordings` bucket |
| `20260907000006_enable_data_api.sql` | Grants to `authenticated`, adds tables to `supabase_realtime` |
| `20260907000007_onboarding_schema.sql` | `created_by`, `onboarding_completed`, `onboarding_progress` columns on `organizations` |

**Existing Edge Functions** (read each):

| Existing function | Maps to plan function | Status |
|---|---|---|
| `trigger-scheduled-calls` | `dialer-tick` | Rewrite: adapt to LiveKit dispatch, use `claim_dialable_leads` RPC |
| `handle-call-webhook` | `voice-events` | Rewrite: add HMAC auth, segment deduplication, analysis job enqueue |
| `process-ai-decision` | `analysis-run` | Rewrite: add `AnalysisProvider` interface, policy engine, action ledger |
| `handle-appointment-webhook` | Part of `voice-tools` or new `calendar-webhook` | Rewrite: migrate to internal CalendarProvider, confirm via `confirm_appointment` RPC |

**Schema reconciliation needed** (write in AUDIT.md):
1. Existing `organization_members` vs plan's `memberships` — keep `organization_members` name, update references in plan code
2. Existing `call_status` enum values vs plan's values — list differences, write a migration to add missing values
3. Existing `transcripts` + `transcript_turns` vs plan's `transcript_segments` — consolidate or alias
4. Existing `evidence_signals` vs plan's `evidence` — rename or create view
5. Existing `outcomes` + `follow_ups` vs plan's `appointments` + `tasks` — check overlap, extend or rename
6. Existing `audit_log` vs plan's `audit_logs` — check column shape, add missing columns

---

## 3. Phase F0 — Frontend Audit (Start Here, in parallel with B0)

**Who:** Frontend developer  
**Output:** `docs/frontend/MIGRATION_MAP.md`  
**Blocking:** All frontend phases.

### Steps:
1. `git checkout -b feat/frontend-v2`
2. `git tag legacy-frontend-final`
3. Write `MIGRATION_MAP.md` using the pre-filled table in `frontend_update.md §F0`
4. Catalogue all direct Supabase calls in `src/hooks/` and `src/services/` — these are the seams that must move to `src/api/http/` in F5
5. Show the map before proceeding

---

## 4. Phase F1 — Foundation and Design System

**Who:** Frontend developer  
**Prerequisite:** F0 MIGRATION_MAP.md approved

### Steps:

#### 4.1 Scaffold new src
```bash
git mv frontend/src frontend/legacy-src
```
- Add `legacy-src` to `.gitignore` patterns in `tsconfig.json` `exclude`, ESLint `ignorePatterns`
- Create `frontend/src/` with folder structure from `FRONTEND_SPEC.md §3.2`

#### 4.2 Install dependencies
```bash
cd frontend
npm install @tanstack/react-query @tanstack/react-table react-hook-form zod sonner cmdk
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction
npm install wavesurfer.js livekit-client @livekit/components-react
npm install date-fns date-fns-tz libphonenumber-js
npx shadcn@latest init  # choose Tailwind v4 option when prompted
```

#### 4.3 Design tokens
- **Do NOT rewrite `index.css`** — extend it
- Add any missing tokens (e.g. `--pending`) to the existing `:root` block
- Map spec token names to actual token names per `01-design-system-and-shell.md §2`
- Add Noto Sans Devanagari to the Google Fonts import in `index.css`

#### 4.4 Zod contracts
- Create `src/contracts/` with one file per entity group: `entities.ts`, `enums.ts`, `voice.ts`, `analysis.ts`
- Use entities from `docs/frontend/04-data-model-and-metrics.md §1`
- Enums from §2 of same file

#### 4.5 Auth seam (critical — use existing logic)
```typescript
// src/auth/adapter.ts  — interface only
export interface AuthAdapter {
  getSession(): Promise<Session | null>
  signIn(email: string, password: string): Promise<{error: Error | null}>
  signUp(email: string, password: string, name?: string): Promise<{...}>
  signOut(): Promise<void>
  onAuthChange(callback: (session: Session | null) => void): () => void
  getMembership(userId: string): Promise<{orgId: string; role: string} | null>
}

// src/auth/supabase.ts — wraps EXISTING AuthContext logic
// Uses organization_members table (NOT memberships) — matches our schema
```

#### 4.6 ApiClient seam
```typescript
// src/api/client.ts
export interface ApiClient { /* all methods from 05-api-realtime-and-ai-contracts.md */ }

// src/api/mock/index.ts  — in-memory store, seeded from 06-mock-data-and-states.md
// src/api/http/index.ts  — fetch + VITE_API_BASE_URL + auth header + X-Org-Id
```

#### 4.7 Mock store
- In-memory, `localStorage`-persisted for refresh continuity
- Seeded from scenarios S1–S14 (to be defined in `scripts/scenarios/*.json`)
- 150–600 ms simulated latency
- Injectable failures via Dev toolbar (slow network, 500s, empty, permission denied)
- Call simulator: queued → dialing → ringing → answered → in_progress → ended → analyzing → completed

#### 4.8 App shell
- Rebuild `AppLayout`, `Sidebar`, `Topbar` from scratch in new `src/`
- Sidebar nav order: Dashboard · Leads · Campaigns · Calls · Review Queue · AI Agents · Appointments · Follow-ups · Insights · Compliance · Notifications · Audit Log · Settings
- Command palette: `cmdk` (⌘K / Ctrl+K)
- Toast: use `sonner` (replace existing `ToastProvider` — but keep old one in `legacy-src` until F4)

#### 4.9 Pattern components (build all, create `/__kit`)
All components from `docs/frontend/01-design-system-and-shell.md §4`:
`KPICard`, `FunnelChart`, `InsightCard`, `ActionQueue`, `EvidencePanel`, `EvidenceChip`, `ConfidenceMeter`, `StatusChip`, `DataTable` (TanStack Table), `FilterBar`, `EntityDrawer`, `Timeline`, `AuditTrail`, `EmptyState`, `ErrorState`, `PermissionGate`, `Stepper/Wizard`, `AudioPlayer` (wavesurfer), `TranscriptView`, `CallStateBadge`, `PhoneText`, `CurrencyText`, `RelativeTime`, `ComplianceBadge`, `ChannelBadge`

---

## 5. Phase F2 — Port the Reference Screens

**Who:** Frontend developer  
**Prerequisite:** F1 complete (`/__kit` passes visual check)

### Order (from `frontend_update.md §F2`):
1. **Dashboard** — KPI strip, funnel, trend chart (Recharts — already installed), action queue, insight cards, health tiles
2. **Leads** — DataTable + lead drawer (EntityDrawer) replacing the old detail page
3. **Review Queue** — Split-pane workspace, keyboard shortcuts a/e/r/j/k
4. **Calls** — Live Calls (3-pane) + Call Detail (audio player, transcript, evidence, action ledger)
5. **Agents** — Test Console (MockVoiceSession + mic meter)
6. **Campaign Wizard** — 7-step wizard shell with preflight
7. **Appointments** — FullCalendar (daygrid + timegrid + list + interaction; free only)
8. **Compliance** — Overview tab + 5 detail tabs

### Per screen checklist:
- [ ] Hook in `src/api/hooks/` with TanStack Query
- [ ] Mock endpoints return seed data for relevant scenarios
- [ ] All states: loading (skeleton), empty (with CTA), error (with requestId), forbidden
- [ ] Light + dark mode
- [ ] Responsive at 390px (tables → cards, panels → bottom sheets)
- [ ] Playwright screenshot at 1440px vs reference HTML

---

## 6. Phase F3 — Remaining Screens and Modals

All screens not covered by the 9 reference screens (from `frontend_update.md §F3`):
- Auth pages (login, signup, OTP verify, forgot password, accept invite)
- Onboarding (4-step wizard)
- Campaigns list + Campaign detail (6 tabs)
- Calls list (history table with transcript search)
- Agents list + template gallery
- Follow-ups (task list + board)
- Insights (objections, intents, script performance, timing, quality, AI evaluation)
- Notifications center
- Audit Log (with diff drawer)
- Settings (all sub-pages: org, team & roles, calling, voice/AI engine, integrations, usage & billing, API & webhooks, data & privacy, preferences, system status)
- Error pages (404, 403, 500)
- All modals from `docs/frontend/03-modals-and-panels.md`

---

## 7. Phase B1 — Backend Foundation

**Who:** Backend developer  
**Prerequisite:** B0 AUDIT.md approved  
**Output:** New `api` Edge Function skeleton, `create_organization` RPC, pgTAP tests

### Key implementation decisions:

#### 7.1 New `api` Edge Function (Hono)
```
supabase/functions/api/
  index.ts          main Hono app
  routes/
    me.ts
    orgs.ts
    leads.ts
    campaigns.ts
    calls.ts
    agents.ts
    appointments.ts
    insights.ts
    compliance.ts
    platform.ts
```

#### 7.2 Membership table name
Use `organization_members` everywhere (not `memberships`). The `is_org_member()` function already exists.

#### 7.3 CORS fix
The existing `_shared/cors.ts` uses `*` — replace with:
```typescript
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? []
```

#### 7.4 JWT verification
New `api` function uses caller's JWT (not service role) so RLS applies. This is different from the existing functions which all use `getAdminClient()` (service role).

#### 7.5 New migrations needed (B1)
- Add `private` schema
- Add `private.set_updated_at()` function (if not exists — check migration 04)
- Add `idempotency_keys` table
- Add `jobs` table
- Add `audit_logs` table (check if `audit_log` from migration 02 can be extended)
- Add `notifications` table
- Add `rate_limits` table
- Add `api_keys` table (hash + prefix only)

---

## 8. Phase B2–B8 — Domain-by-Domain Backend

Follow the phases in `backend_update.md §10`. Key implementation notes for each:

### B2 Leads
- `leads` table already exists — write a migration to add missing columns (compliance snapshot, DND fields, consent fields, `deleted_at`)
- Import job: use the `jobs` table + `job-runner` function
- Trigram index for search: `pg_trgm` extension (check if enabled — add if not)

### B3 Agents
- `agents` table exists — add `agent_versions` table (immutable once published)
- `test-session` endpoint mints a LiveKit token — requires `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` secrets

### B4 Campaigns + Compliance
- `campaigns` table exists — add missing columns (rules, criteria, schedule, budget cap)
- `dialer-tick`: rewrite `trigger-scheduled-calls` as `dialer-tick` with `claim_dialable_leads` RPC
- For demos: `scripted_replay` mode — no real phone calls needed

### B5 Calls (voice pipeline)
- `calls` table exists — add `lead_mode`, `channel`, `analysis_status`, `compliance_snapshot` columns
- Rewrite `handle-call-webhook` as `voice-events` with HMAC auth and deduplication
- Add `transcript_segments` table (may merge with existing `transcript_turns`)
- Enable Supabase Realtime on new tables

### B6 Intelligence (AI)
- `decisions` and `evidence_signals` tables exist — add missing columns, add `conversation_analyses` table
- Rewrite `process-ai-decision` as `analysis-run` with `AnalysisProvider` interface
- Built-in `InlineGeminiProvider` using Gemini text model — enables AI pipeline before the Resonology AI service exists
- Policy engine: pure TypeScript functions in `_shared/policy/`

### B7 Scheduling
- `appointments` and `follow_ups` tables exist — add exclusion constraint for double-booking, add `availability_rules` table
- Internal `CalendarProvider` (no external calendar integration yet)

### B8 Analytics
- SQL functions for dashboard aggregations, insights, cost rollup

---

## 9. Phase B5 Parallel — Python Voice Worker

**Who:** Voice/AI developer  
**Prerequisite:** B5 complete (calls infrastructure ready)  
**Location:** `backend/voice-agent/`

### Stack:
- Python 3.11+, `uv` for package management
- `livekit-agents` SDK
- Gemini Live API (`google-generativeai`)
- Pydantic models generated from Zod contracts (`scripts/export-json-schema.ts`)

### Key implementation:
1. Agent joins LiveKit room, speaks mandatory disclosure line first
2. Sends events to `voice-events` function (HMAC signed)
3. Calls tools via `voice-tools` function
4. `scripted_replay` mode: replay scenario JSON files (S1–S14) for demos/CI

---

## 10. Phase B6 Parallel — Resonology AI Service

**Who:** AI developer (Shubham)  
**Location:** `backend/resonology-ai/`

### API:
```
POST /v1/analyze    — transcript → ConversationAnalysis
GET  /healthz
GET  /v1/version
```

### Input: transcript segments + agent context + campaign criteria
### Output: `ConversationAnalysisSchema` (from Zod contracts, exported as JSON Schema)

### Key constraints:
- Use Gemini **text** model (not Live API) — structured JSON output
- Every derived value must have `evidence` (segment IDs + quote)
- Return typed failure if schema validation fails — never partially apply
- Prompt injection: delimit transcript text in prompt, mark as untrusted

---

## 11. Phase F4 — Retire Legacy Frontend

After F3 is complete and all domains switched to the real API:
1. Confirm every row in `MIGRATION_MAP.md` is resolved
2. `git rm -r frontend/legacy-src`
3. Remove unused dependencies
4. Update `frontend/README.md` with mock mode and API mode instructions

---

## 12. Phase F5 — Switch to Real Data, Domain by Domain

As each backend phase completes, switch that domain:
```bash
# In frontend/.env.local:
VITE_DATA_SOURCE=mock
VITE_API_DOMAINS=leads,agents   # these two use the real API, rest stay on mock
```

Switch order follows backend phase order: auth → leads → agents → campaigns → calls → review → appointments → dashboard

---

## 13. Implementation Gates (never skip)

| Gate | Before | Check |
|---|---|---|
| B0 AUDIT.md written | Any new migration | Show AUDIT.md to the team |
| F0 MIGRATION_MAP.md written | Deleting or moving legacy code | Show MIGRATION_MAP.md |
| Schema reconciliation | Any new B1+ migration | New migration doesn't drop existing columns |
| Mock layer complete | Any screen work in F2/F3 | Every screen works in mock mode |
| Playwright smoke passes | Any PR | `npm run test:e2e` green in mock mode |
| Swap-readiness checklist | F5 starts | All items in `FRONTEND_SPEC.md §10` ticked |
| Security advisor clean | Before demo | Supabase dashboard Security Advisor green |

---

## 14. File Ownership Quick Reference

| Path | Who owns it | Changes via |
|---|---|---|
| `frontend/src/contracts/` | Frontend + Backend both | PR that changes both the Zod schema and the DB migration |
| `supabase/migrations/` | Backend | New forward-only migration files only |
| `supabase/functions/` | Backend | `supabase functions deploy` |
| `frontend/src/api/mock/` | Frontend | Seeded from `scripts/scenarios/` |
| `frontend/src/features/` | Frontend | Never imports Supabase, fetch, or mock directly |
| `backend/resonology-ai/` | AI developer | JSON Schema imported from `scripts/export-json-schema.ts` |
| `backend/voice-agent/` | Voice developer | Scenario files from `scripts/scenarios/` |
| `docs/frontend/DECISIONS.md` | Whoever makes the call | Append only, newest first |
| `docs/backend/AUDIT.md` | Backend | Created in B0, updated as discoveries happen |

---

## 15. Tech Debt in the Existing Code to Fix Before F5

| Item | Where | Fix |
|---|---|---|
| `_shared/cors.ts` uses `"*"` | `supabase/functions/_shared/cors.ts` | Restrict to `ALLOWED_ORIGINS` env var |
| All functions use `getAdminClient()` (service role) | All existing Edge Functions | New `api` function uses caller JWT; only system functions use service role |
| Existing hooks call Supabase directly | `frontend/src/hooks/`, `frontend/src/services/` | Move to `src/api/http/` in F5 |
| `AuthContext` calls Supabase directly | `frontend/src/contexts/AuthContext.tsx` | Refactor to `SupabaseAuth` adapter |
| `organization_members` vs plan's `memberships` name | All plan docs mentioning `memberships` | Use `organization_members` everywhere in code; plan docs corrected |
| No TypeScript strict config | `frontend/tsconfig.json` | Enable `strict: true` in new `src/` (keep lenient for `legacy-src/`) |
