# Project Contribution & Architectural Ownership Matrix

> **Project:** IntelliCall (Powered by Resonology AI)  
> **Course / Context:** 5th Semester Full Stack Development (FSD)  
> **Academic Year:** 2026

---

## 1. Architectural Overview & Team Roster

IntelliCall is engineered as a decoupled 3-tier enterprise architecture consisting of a **React 19 Frontend**, an **Express.js API Backend**, and a **Supabase PostgreSQL Database Tier**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PROJECT CONTRIBUTORS                            │
├────────────────────┬────────────────────────────────────────────────────────┤
│ Contributor        │ Designated Domain Title                                │
├────────────────────┼────────────────────────────────────────────────────────┤
│ **Anay Sharma**    │ Lead Architect & AI Systems Engineer                   │
│ **Vishal Kashyap** │ Backend Framework & Frontend UI Lead                   │
│ **Vishal Kumar**   │ Quality Assurance & Test Verification Lead             │
│ **Vaasu Goyal**    │ Compliance Policy & Technical Documentation Lead       │
└────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Module Ownership Breakdown

### 2.1 Anay Sharma — *Lead Architect & AI Systems Engineer*
* **System Architecture & Design:**
  - Formulated the overall technical architecture, data contracts, and implementation roadmap (`docs/ai_llm_architecture.md`, `docs/FRONTEND_SPEC.md`).
  - Authored the cross-layer debugging reports diagnosing acoustic waveform standby handling and PostgreSQL ACL permissions (`docs/Debugging/`).
* **Real-Time Voice AI Engine:**
  - Designed the direct Google Gemini Multimodal Live speech-to-speech audio streaming pipeline over secure WebSockets.
  - Implemented the 100ms linear PCM framing accumulator (`TARGET_CHUNK_SIZE = 1600` samples at 16kHz) to eliminate server VAD buffer starvation.
  - Built the linear interpolation audio downsampling algorithm and hybrid client RMS VAD (`rms > 0.012`) with `audioStreamEnd` turn commitment.
* **Express AI Microservice:**
  - Built `backend/services/aiAnalysisService.js` connecting Gemini 2.0 Flash for structured JSON extraction of executive summaries, primary intent confidence, sentiment, satisfaction, compliance scores, and risk signals.
  - Built `backend/services/decisionEngineService.js` parsing transcript turns for budget, timeline, and authority indicators with campaign confidence thresholds.
* **Database & Cloud Infrastructure:**
  - Designed all 11 PostgreSQL SQL migrations on Supabase Cloud, creating 19 normalized relational tables, triggers (`touch_updated_at`, `trg_lead_status_history`), and multi-tenant Row Level Security (RLS) policies.
  - Authored automated cloud deployment scripts (`scripts/deploy-supabase-cloud.ps1`, `scripts/deploy-supabase-cloud.sh`).
* **CRM Sales Pipeline:**
  - Engineered the 7-stage dual Kanban Board / Compact List switcher (`LeadKanbanBoard.tsx`, `LeadCompactTable.tsx`).
  - Built the autonomous AI call scheduling modal (`ScheduleAICallModal.tsx`) and prospect detail view (`LeadDetailPage.tsx`).
  - Built the mobile Phone Simulator client (`PhoneSimulatorPage.tsx`) with Web Audio API DTMF synthesizer, haptic vibration, and wake-lock API.

---

### 2.2 Vishal Kashyap — *Backend Framework & Frontend UI Lead*
* **Express Backend Architecture & Server Scaffolding:**
  - Scaffolded the standalone Express.js backend repository (`backend/server.js`, `package.json`).
  - Built the global centralized error handler (`backend/middleware/errorHandler.js`) and asynchronous route wrapper (`backend/middleware/asyncHandler.js`).
* **Multi-Tenant Security Middleware:**
  - Engineered `backend/middleware/auth.js` for Bearer JWT token extraction and Supabase Auth verification.
  - Engineered `backend/middleware/orgContext.js` verifying active workspace membership from the `X-Org-Id` header and enforcing Role-Based Access Control (`requireRole`).
* **REST API Entity Controllers:**
  - Implemented and wired controllers and routes for:
    - `leadController.js` & `leadRoutes.js` (Full CRUD operations for sales prospects).
    - `agentController.js` & `agentRoutes.js` (Persona management, voice selection, brevity controls).
    - `campaignController.js` & `campaignRoutes.js` (Dialing hours, daily budgets, concurrency limits).
    - `callController.js` & `callRoutes.js` (Call session history, pagination, transcript turns).
    - `appointmentController.js` & `appointmentRoutes.js` (Callback bookings and scheduling).
* **Frontend UI Redesign & Brand Alignment:**
  - Led the comprehensive visual redesign of the primary landing page (`LandingPage.tsx`), contributing over 1,200 lines of marketing UI code, interactive product showcases, and testimonial carousels.
  - Overhauled navigation chrome (`Sidebar.tsx`, `Topbar.tsx`) and polished component primitives (`Button.tsx`, `KPICard.tsx`, `FilterBar.tsx`).
  - Harmonized design system tokens, typography (IBM Plex Sans / Mono), and dark mode elevation tokens in `index.css`.
* **Client-Side Contract & Schema Alignment:**
  - Resolved schema discrepancies in `frontend/src/api/http/index.ts` across appointments, leads, and campaigns, ensuring data parity between client contracts and backend payloads.

---

### 2.3 Vishal Kumar — *Quality Assurance & Test Verification Lead*
* **Express REST API Verification:**
  - Formulated API test cases and endpoint verification scenarios for all 14 Express.js API routers (`/api/v1/auth`, `/api/v1/leads`, `/api/v1/agents`, `/api/v1/campaigns`, `/api/v1/calls`, `/api/v1/decisions`, `/api/v1/appointments`, `/api/v1/compliance`, `/api/v1/phone-numbers`, `/api/v1/analytics`, `/api/v1/organizations`, `/api/v1/webhooks`, `/api/v1/ai`, `/api/v1/storage`).
  - Validated HTTP status code integrity (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Error) across diverse query parameters.
* **Lead Data Ingestion & Batch Testing:**
  - Conducted boundary testing and validation on the multi-prospect batch CSV import parsing pipeline (`POST /api/v1/leads/bulk`).
  - Verified phone number normalization edge cases (international formats, leading zeros, Indian 10-digit mobile standards).
  - Prepared sample benchmark test datasets with mock prospect records across financial refinancing scenarios.
* **Frontend Smoke Testing & Form Validation:**
  - Executed exploratory testing across primary client views (Dashboard, Leads Kanban, Settings, Review Queue, Phone Simulator).
  - Verified user-facing form validation logic, ensuring required fields (email, lead phone, campaign budget) display appropriate error indicators when submitted with invalid or missing inputs.
* **Call Lifecycle State Transition Testing:**
  - Validated sequential state transitions in simulated call sessions: `scheduled` &rarr; `calling` &rarr; `connected` &rarr; `processing` &rarr; `completed`.
  - Tested webhook ingestion endpoints with mock voice provider payloads to verify database synchronization.

---

### 2.4 Vaasu Goyal — *Compliance Policy & Technical Documentation Lead*
* **Regulatory Compliance Engine Research:**
  - Researched regulatory requirements governing telemarketing and automated calling in India, including Telecom Regulatory Authority of India (TRAI) calling hour windows (9:00 AM – 8:00 PM) and National Do Not Call (DND) guidelines.
  - Curated the initial phrase dictionaries for required disclosures (e.g. recorded call notifications, terms explanations) and prohibited phrases stored in the `compliance_rules` database schema.
  - Configured regulatory breach enforcement actions (`flag`, `terminate_call`, `escalate`) mapped to compliance audit scores.
* **Sales Objection Playbook & Campaign Presets:**
  - Researched common B2B and B2C sales objections (e.g. *Time Constraints / Driving*, *Authority Deflection*, *Price / Rate Skepticism*, *Competitor Mentions*).
  - Structured the objection resolution scripts and counter-prompt frameworks incorporated into `campaigns.objection_playbook` and strategy configs.
* **Containerization & Deployment Configuration:**
  - Maintained the multi-container configuration in `docker-compose.yml` orchestrating the Express backend, Vite client, and PostgreSQL database.
  - Documented environment security standards, API key configurations, and secret isolation guidelines in `docs/environment_and_secrets.md`.
* **Technical Documentation & Deliverables:**
  - Co-authored system documentation, user manuals, and technical specification guides in `docs/`.
  - Assisted in compiling project submission deliverables, architecture diagrams, and academic evaluation reports.

---

## 3. Collaboration & Governance Summary

All four team members collaborated through coordinated feature branches, regular sprint reviews, peer test verification, and documentation checkpoints:
- **Code & Architecture Reviews:** Core architectural proposals and schema migrations were reviewed and verified prior to remote deployment.
- **Verification Gate:** API changes in Express were validated against testing checklists and verified on live local instances.
- **Documentation Parity:** Technical guides were kept continuously synchronized with live codebase changes.
