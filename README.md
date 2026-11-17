# IntelliCall — AI-Powered Revenue Operations & Conversation Intelligence

Public application repository for the IntelliCall (Resonology AI) platform.

> 🌐 **Live Production Deployment:** [https://intellicall.pages.dev](https://intellicall.pages.dev)  
> *Deployed on **Cloudflare Pages** by **Anay Sharma***

---

## 1. Project Overview

**IntelliCall** is an AI-powered Revenue Operations and Conversation Intelligence platform designed for high-velocity sales, customer engagement, and autonomous qualification workflows. The platform provides real-time telephonic intelligence, automated lead scoring, pipeline analytics, and multi-tenant workspace management.

This repository features:
- A responsive, high-performance **React 19 + TypeScript** single-page application (SPA).
- A standalone **Node.js + Express.js** backend providing secure REST APIs, JWT authentication verification, multi-tenant organization context resolution, full CRUD operations for CRM entities, and post-call conversational intelligence.
- A **PostgreSQL database** managed via **Supabase** with Row Level Security (RLS) policies and automated triggers.

---

## 2. Technology Stack

### Frontend
- **Framework & Runtime**: React 19, TypeScript 5.7, Vite 8
- **Styling & UI**: Tailwind CSS 4, Lucide React icons, Sonner toast notifications, cmdk
- **State & Data Management**: TanStack Query (React Query v5), TanStack Table v9, React Hook Form, Zod v4
- **Routing**: React Router v7
- **Data Visualization**: Recharts
- **Database Client**: Supabase JavaScript Client (`@supabase/supabase-js v2.115.0`)

### Backend
- **Server Framework**: Node.js (ES Modules `"type": "module"`), Express.js v4.21.2
- **Database Client**: Supabase JavaScript Client (`@supabase/supabase-js v2.115.0`)
- **AI Engine**: Google Gemini Multimodal Live API & Gemini 2.0 Flash
- **Security & Utilities**: `cors v2.8.5`, `dotenv v16.4.7`
- **Development Tooling**: `nodemon v3.1.9`

### Database & Auth
- **Database**: PostgreSQL (hosted via Supabase Cloud)
- **Authentication**: Supabase Auth (JWT Bearer tokens)
- **Access Control**: PostgreSQL Row Level Security (RLS) with role-based policies (`is_org_member`, `has_org_role`)
- **Storage**: Private bucket for audio recordings (`call-recordings`)

---

## 3. Project Structure

```
FSD_IntelliCall/
├── backend/                             # Express.js REST API backend
│   ├── config/                          # Stateless public client & request-scoped client factory
│   │   └── supabase.js
│   ├── controllers/                     # Entity, webhook, and AI controllers
│   │   ├── agentController.js
│   │   ├── aiController.js
│   │   ├── analyticsController.js
│   │   ├── appointmentController.js
│   │   ├── authController.js
│   │   ├── callController.js
│   │   ├── campaignController.js
│   │   ├── complianceController.js
│   │   ├── decisionController.js
│   │   ├── leadController.js
│   │   ├── organizationController.js
│   │   ├── phoneNumberController.js
│   │   ├── storageController.js
│   │   └── webhookController.js
│   ├── middleware/                      # Auth, tenant resolution, and error handling
│   │   ├── asyncHandler.js
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── orgContext.js
│   │   └── webhookAuth.js
│   ├── routes/                          # 14 REST API route definitions
│   ├── services/                        # AI analysis, decision scoring, and telephony services
│   │   ├── aiAnalysisService.js
│   │   ├── decisionEngineService.js
│   │   ├── schedulerService.js
│   │   └── telephonyService.js
│   ├── .env.example                     # Backend environment configuration template
│   ├── package.json                     # Backend dependencies and execution scripts
│   └── server.js                        # Express app initialization, CORS, and route mounting
├── frontend/                            # React + Vite + TypeScript client application
│   ├── src/
│   │   ├── api/                         # API clients, HTTP wrappers, and query hooks
│   │   ├── app/                         # App routing and shell components
│   │   ├── auth/                        # Supabase client and AuthContext provider
│   │   ├── components/                  # Shared UI components and primitives
│   │   ├── contracts/                   # Data transfer objects and entity definitions
│   │   ├── features/                    # Domain feature modules (leads, campaigns, analytics)
│   │   ├── lib/                         # Permissions, utilities, and date formatters
│   │   ├── types/                       # TypeScript interfaces and contracts
│   │   └── voice/                       # Voice agent interfaces
│   ├── package.json                     # Frontend dependencies and Vite scripts
│   └── vite.config.ts                   # Vite build and development configuration
├── database/                            # Schema, migrations, and seed definitions
├── supabase/                            # Supabase cloud config and SQL migrations
│   └── migrations/                      # Versioned PostgreSQL schema migrations
├── deployment/                          # Infrastructure and container configurations
├── docs/                                # Technical documentation
│   ├── final_docs/                      # Official project deliverables & specifications
│   │   ├── CONTRIBUTION.md              # Team Matrix & Module Ownership
│   │   ├── ARCHITECTURE.md              # 3-Tier Architecture Specification
│   │   ├── API_DOCUMENTATION.md         # Detailed REST API reference & payloads
│   │   └── DEPLOYMENT.md                # Cloudflare Pages hosting guide
│   ├── dev_docs/                        # Development specs, research & debugging reports
│   └── docs_index.md                    # Master documentation directory
└── tests/                               # Test specifications and verification fixtures
```

---

## 4. Backend Features

- **Modular Express Setup (`server.js`)**: Configured with JSON body parsing, environment-driven CORS origins, route namespaces, 404 fallthrough handlers, centralized error handling, and background scheduled call polling.
- **System Health Endpoint**: Lightweight `GET /api/health` probe for container orchestrators, monitoring tools, and load balancers.
- **JWT-Based Authentication (`middleware/auth.js`)**: Extracts incoming `Bearer <token>` headers and validates identity against Supabase Auth. Differentiates invalid/expired tokens (`401`) from infrastructure network disruptions (`503`).
- **Per-Request Authenticated Client (`config/supabase.js`)**: Instantiates an isolated Supabase client forwarding the caller's JWT through `Authorization: Bearer <token>`, allowing PostgreSQL to enforce Row Level Security (`auth.uid() = user.id`) on all queries.
- **Multi-Tenant Organization Verification (`middleware/orgContext.js`)**: Validates the tenant header (`X-Org-Id`) against the `organization_members` database table to confirm active membership (`status = 'active'`). Attaches verified `req.orgId` and `req.userRole` to the request object.
- **Role-Based Authorization (`requireRole`)**: Strictly enforces role permissions mirroring PostgreSQL `has_org_role()`:
  - `owner`: Requires owner role.
  - `admin`: Permitted for owners and administrators.
  - `member`: Permitted for all active organization members.
- **Leads & Pipeline CRUD (`controllers/leadController.js`)**: Complete set of endpoints to list, retrieve, create, update, delete, and bulk-import leads strictly scoped by `organization_id`. Request bodies cannot spoof tenant ownership.
- **Conversational Intelligence Pipelines (`services/aiAnalysisService.js`)**: Post-call deep structured JSON analysis powered by Google Gemini 2.0 Flash (`gemini-2.0-flash`) with deterministic fallback analysis.
- **Centralized Error Handling (`middleware/errorHandler.js`)**: Formats uncaught exceptions into clean, consistent JSON error structures while concealing sensitive database internals and tokens from client responses.

---

## 5. Security Architecture

- **Bearer Token Authentication**: Every protected endpoint verifies incoming JWTs against Supabase Auth.
- **Dual-Layer Multi-Tenancy**:
  - **Application Layer**: `requireOrgContext` verifies the caller is an active member of the requested tenant in `organization_members`. Database queries strictly append `.eq('organization_id', req.orgId)`. Any caller-supplied `organization_id` in request payloads is ignored.
  - **Database Layer (RLS)**: Queries run through a per-request Supabase client configured with the caller's JWT, activating PostgreSQL Row Level Security policies (`is_org_member(organization_id)`).
- **Role-Based Authorization (RBAC)**: Privileged actions such as lead deletion or campaign modification enforce `requireRole('admin')`, ensuring only users with admin or owner status can modify records.
- **Information Disclosure Prevention**: Centralized error handlers mask low-level database errors, SQL state codes, internal traces, and user JWTs from API responses.
- **No Service-Role Key Abuse**: Normal client requests never use the high-privilege `SUPABASE_SERVICE_ROLE_KEY`. Only public anonymous keys and user-scoped JWTs are utilized on client request paths.
- **Zero Hardcoded Secrets**: All credentials are loaded strictly from environment variables. `.env` files are excluded via `.gitignore`.

---

## 6. Project Team & Engineering Contributions

| Contributor | Domain Specialization | Core Responsibilities & Deliverables |
| :--- | :--- | :--- |
| **Anay Sharma** | **Lead Architect & AI Systems Engineer** | • Overall System Architecture, Technical Planning & API Specifications<br>• Real-Time Voice AI Stack (Gemini Live speech-to-speech, 100ms accumulator, client RMS VAD)<br>• Express Post-Call Intelligence (`aiAnalysisService.js`) & Decision Engine (`decisionEngineService.js`)<br>• Supabase PostgreSQL Database (11 SQL Migrations, RLS Policies, Triggers)<br>• Sales CRM Kanban Pipeline (`LeadsPage.tsx`) & Mobile Phone Simulator (`PhoneSimulatorPage.tsx`) |
| **Vishal Kashyap** | **Backend Framework & Frontend UI Lead** | • Express.js Backend Architecture, Server Scaffolding & Routing Framework (`backend/server.js`)<br>• Multi-Tenant Middleware (`orgContext.js`) & Bearer Token Authentication Middleware (`auth.js`)<br>• Core Entity REST Controllers (Leads, Agents, Campaigns, Calls, Appointments, Compliance)<br>• Comprehensive Marketing UI & Landing Page Redesign (`LandingPage.tsx`, +1,200 lines UI code)<br>• UI Component Primitives, Responsive Navigation Chrome & Design Tokens (`index.css`) |
| **Vishal Kumar** | **Quality Assurance & Test Verification Lead** | • Express REST API Verification (Status code validation, input sanitization, error responses across all 14 routes)<br>• Batch Lead Ingestion Testing (RFC 4180 CSV parsing edge cases, phone normalization for `POST /api/v1/leads/bulk`)<br>• System Integration Testing (Call state machine validation: `scheduled` &rarr; `calling` &rarr; `connected` &rarr; `completed`)<br>• Frontend Form Validation & Boundary Condition Checks |
| **Vaasu Goyal** | **Compliance Policy & Technical Documentation Lead** | • Regulatory Compliance Rule Specifications (TRAI calling window guidelines & mandatory disclosures in `compliance_rules`)<br>• B2B Sales Objection Playbook Research (Busy/Driving, Skeptical/Source, Not Interested presets)<br>• Containerization Orchestration (`docker-compose.yml`) & Local Deployment Configuration<br>• OpenAPI / REST Endpoint Technical Documentation & Academic Project Deliverables |

For detailed module breakdown, see [docs/final_docs/CONTRIBUTION.md](./docs/final_docs/CONTRIBUTION.md).

---

## 7. API Documentation

### Base URL
`http://localhost:5000`

### Required Headers
For all protected `/api/v1/*` endpoints:
- `Authorization: Bearer <supabase_jwt_access_token>` (Required for all `/api/v1` routes)
- `X-Org-Id: <organization_uuid>` (Required for tenant-scoped routes)

### Key Endpoints Overview

| Method | Endpoint | Description | Access / Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | Public |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile | Authenticated user |
| `GET` | `/api/v1/leads` | List all leads for active organization | Active organization member |
| `POST` | `/api/v1/leads` | Create a new lead | Active organization member |
| `POST` | `/api/v1/leads/bulk` | Bulk import leads array | Active organization member |
| `GET` | `/api/v1/leads/:id` | Retrieve single lead by ID | Active organization member |
| `PUT` | `/api/v1/leads/:id` | Update an existing lead | Active organization member |
| `DELETE` | `/api/v1/leads/:id` | Delete a lead | Organization Admin or Owner only |
| `GET` | `/api/v1/agents` | List conversational voice agents | Active organization member |
| `GET` | `/api/v1/campaigns` | List outbound calling campaigns | Active organization member |
| `GET` | `/api/v1/calls` | List call sessions with filters & pagination | Active organization member |
| `POST` | `/api/v1/ai/analysis/run` | Run Gemini 2.0 Flash post-call analysis | Active organization member |
| `POST` | `/api/v1/webhooks/calls` | Inbound telephony webhook | Webhook Secret / Signature |
| `POST` | `/api/v1/webhooks/appointments` | Inbound calendar booking webhook | Webhook Secret / Signature |

For complete request/response JSON payload examples, see **[docs/final_docs/API_DOCUMENTATION.md](./docs/final_docs/API_DOCUMENTATION.md)**.

---

## 8. Testing and Verification

The Express backend has been validated across comprehensive verification suites:

- **Phase 2 Authentication & Security Suite: 38 / 38 passed**
  - Missing environment variable fail-fast detection.
  - Valid client initialization without placeholder fallbacks.
  - 401 handling for missing, malformed, and invalid JWTs.
  - 503 handling for network/infrastructure failures without token exposure.
  - 403 handling for missing or inactive organization memberships.
  - 500/503 differentiation for database connection and query failures.
  - Full RBAC matrix validation for owner, admin, and member roles.
  - 500 rejection for unsupported role arguments.
  - Successful user context and RLS-scoped client attachment.

- **Phase 3 Leads CRUD & RBAC Suite: 25 / 25 passed**
  - Tenant-scoped retrieval (`GET /api/v1/leads`).
  - ID-based lookup with 404 handling (`GET /api/v1/leads/:id`).
  - Input validation and payload sanitization (`POST /api/v1/leads`).
  - Field whitelisting and timestamp maintenance (`PUT /api/v1/leads/:id`).
  - Role-restricted deletion (`DELETE /api/v1/leads/:id`):
    - Owner deletion permitted (200 OK)
    - Admin deletion permitted (200 OK)
    - Member deletion blocked (403 Forbidden)
    - Agent operator deletion blocked (403 Forbidden)
    - Viewer deletion blocked (403 Forbidden)
  - Unauthenticated access prevention across all endpoints (401 Unauthorized).

---

## 9. Environment Setup & Execution

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Installation & Execution
```bash
# 1. Clone repository
git clone https://github.com/AnaySharmaCEO/FSD_IntelliCall.git
cd FSD_IntelliCall

# 2. Configure Backend
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, and GEMINI_API_KEY
npm install
npm run dev      # Runs Express API on http://localhost:5000

# 3. Configure Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev      # Runs Vite Frontend on http://localhost:5173
```

---

## 📚 Project Documentation

Documentation is organized inside the [`docs/`](./docs) directory:

### 📁 Final Project Deliverables (`docs/final_docs/`)
- [Team Contribution & Ownership Matrix](./docs/final_docs/CONTRIBUTION.md)
- [3-Tier System Architecture Specification](./docs/final_docs/ARCHITECTURE.md)
- [Express REST API Endpoint Specification](./docs/final_docs/API_DOCUMENTATION.md)
- [Cloudflare Pages Deployment Guide](./docs/final_docs/DEPLOYMENT.md)

### 📁 Development & Research Specs (`docs/dev_docs/`)
- [Master Documentation Index](./docs/docs_index.md)
- [Voice AI Architecture & Audio Protocols](./docs/dev_docs/ai_llm_architecture.md)
- [Competitive Telephony Benchmarks](./docs/dev_docs/COMPETITIVE_BENCHMARK.md)
- [Frontend User Interface Specifications](./docs/dev_docs/FRONTEND_SPEC.md)

---

## 📄 License

This project is licensed under the Non-Commercial Academic License — see the [LICENSE](./LICENSE) file for details.  
Copyright (c) 2026 Anay Sharma, Vishal Kashyap, Vishal Kumar, Vaasu Goyal (IntelliCall Team).
