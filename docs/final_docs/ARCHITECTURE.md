# IntelliCall — 3-Tier System Architecture Specification

> **Official Project Architecture Specification**  
> **Platform:** IntelliCall (Powered by Resonology AI)

---

## 1. Architectural Overview

IntelliCall is structured as an enterprise-grade **3-Tier Decoupled Application**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     1. CLIENT TIER (React 19 + Vite)                   │
 │  • Real-Time Call Telemetry Cockpit       • 7-Stage Sales CRM Kanban   │
 │  • Mobile Phone Simulator (/phone-sim)   • Agent Persona Studio       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │  HTTP / REST (/api/v1/...)
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                   2. APPLICATION BACKEND (Express.js)                  │
 │  • 14 Modular REST API Routers (Auth, Leads, Campaigns, Calls, AI)     │
 │  • Multi-Tenant Organization Context (X-Org-Id) & RBAC Guardrails      │
 │  • Telephony & Calendar Webhook Receivers (Twilio / Calendly)          │
 │  • Gemini 2.0 Flash Post-Call Structured Intelligence Pipeline         │
 │  • Heuristic Signal & Confidence Evaluation Engine                     │
 │  • Automated Outbound Scheduled Call Queue & Dispatcher                │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │  PostgreSQL Connection & JWT Verification
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    3. DATABASE TIER (Supabase Cloud)                   │
 │  • Hosted PostgreSQL Database (19 Relational Tables & SQL Triggers)    │
 │  • Multi-Tenant Row Level Security (RLS) Isolation Policies            │
 │  • Authentication Identity Store & Bearer Token Verification           │
 │  • Private Storage Bucket for Audio Recordings (`call-recordings`)     │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier Details

### Tier 1: Client Application (Frontend)
- **Framework**: React 19 with Vite bundler.
- **Styling**: Tailwind CSS v4 with dark mode and high-density financial data tokens.
- **Key Views**:
  - `/dashboard`: Real-time KPI telemetry, active call stream, sentiment distribution.
  - `/leads`: 7-stage CRM Kanban pipeline with inline AI call dispatching.
  - `/calls`: Historical call audits, audio scrubber, verbatim transcript turns.
  - `/phone-simulator`: Mobile-responsive voice receiver with Web Audio API DTMF tones and haptic vibration.
  - `/settings`: Multi-tab workspace configuration, telephony trunks, and team RBAC.

### Tier 2: Application Server (Express.js Backend)
- **Runtime**: Node.js (ES Modules).
- **Core Endpoints**: 14 decoupled routers mounted under `/api/v1/...`.
- **Security Middleware**:
  - `auth.js`: Extracts and validates Bearer JWT access tokens.
  - `orgContext.js`: Reads `X-Org-Id` header, verifies active organization membership, and enforces RBAC (`owner`, `admin`, `member`).
- **AI Services**:
  - `aiAnalysisService.js`: Connects to Google Gemini 2.0 Flash for structured JSON extraction (executive summaries, primary intent confidence, satisfaction, compliance, action items, risk signals).
  - `decisionEngineService.js`: Evaluates dialogue turns for budget, urgency, authority, and objection signals.
- **Automation**: Native recurring scheduler (`schedulerService.js`) scanning and dispatching due scheduled calls.

### Tier 3: Database & Auth Tier (Supabase PostgreSQL)
- **Database Engine**: PostgreSQL 16 hosted on Supabase Cloud.
- **Schema**: 19 normalized relational tables across 11 forward-only SQL migrations.
- **Integrity**: Row Level Security (RLS) policies enforcing strict organization isolation.
- **Storage**: Private bucket `call-recordings` with 1-hour signed URL generation.
