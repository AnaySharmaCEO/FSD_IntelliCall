# IntelliCall — AI-Powered Revenue Operations & Conversation Intelligence

Public application repository for the IntelliCall (Resonology AI) platform.

---

## 1. Project Overview

**IntelliCall** is an AI-powered Revenue Operations and Conversation Intelligence platform designed for high-velocity sales, customer engagement, and autonomous qualification workflows. The platform provides real-time telephonic intelligence, automated lead scoring, pipeline analytics, and multi-tenant workspace management.

This repository features:
- A responsive, high-performance **React + TypeScript single-page application (SPA)**.
- A newly implemented **Node.js + Express.js backend** providing secure REST APIs, JWT authentication verification, multi-tenant organization context resolution, and full CRUD operations for lead management.
- A **PostgreSQL database** managed via **Supabase** with Row Level Security (RLS) policies and automated triggers.

---

## 2. Technology Stack

### Frontend
- **Framework & Runtime:** React 19, TypeScript 5.7, Vite 8
- **Styling & UI:** Tailwind CSS 4, Lucide React icons, Sonner toast notifications, cmdk
- **State & Data Management:** TanStack Query (React Query v5), TanStack Table v9, React Hook Form, Zod v4
- **Routing:** React Router v7
- **Data Visualization:** Recharts
- **Database Client:** Supabase JavaScript Client (`@supabase/supabase-js` v2.115.0)

### Backend
- **Server Framework:** Node.js (ES Modules `"type": "module"`), Express.js v4.21.2
- **Database Client:** Supabase JavaScript Client (`@supabase/supabase-js` v2.115.0)
- **Security & Utilities:** `cors` v2.8.5, `dotenv` v16.4.7
- **Development Tooling:** `nodemon` v3.1.9

### Database & Auth
- **Database:** PostgreSQL (hosted via Supabase)
- **Authentication:** Supabase Auth (JWT Bearer tokens)
- **Access Control:** PostgreSQL Row Level Security (RLS) with role-based policies (`is_org_member`, `has_org_role`)

---

## 3. Project Structure

```
FSD_IntelliCall/
├── backend/                             # Express.js REST API backend
│   ├── config/
│   │   └── supabase.js                  # Stateless public client & per-request client factory
│   ├── controllers/
│   │   ├── authController.js            # User identity & profile controllers
│   │   └── leadController.js            # Full Leads CRUD controllers
│   ├── middleware/
│   │   ├── asyncHandler.js              # Async wrapper for clean promise error handling
│   │   ├── auth.js                      # Bearer JWT verification via Supabase Auth
│   │   ├── errorHandler.js              # Centralized global error handling middleware
│   │   └── orgContext.js                # Multi-tenant workspace resolution & RBAC checks
│   ├── routes/
│   │   ├── authRoutes.js                # /api/v1/auth route registrations
│   │   └── leadRoutes.js                # /api/v1/leads route registrations
│   ├── utils/                           # Helper utilities
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
├── docs/                                # Technical documentation and guides
└── tests/                               # Test specifications and fixtures
```

---

## 4. Backend Features

- **Express Server Setup (`server.js`):** Modular ES-module setup configured with JSON body parsing, environment-driven CORS origins, route namespaces, 404 fallthrough handlers, and centralized error handling.
- **System Health Endpoint:** Lightweight `GET /api/health` probe for container orchestrators and monitoring tools.
- **JWT-Based Authentication (`middleware/auth.js`):** Extracts incoming `Bearer <token>` headers and validates identity against Supabase Auth. Differentiates invalid/expired tokens (401) from infrastructure network disruptions (503).
- **Per-Request Authenticated Client (`config/supabase.js`):** Instantiates a stateless, isolated Supabase client forwarding the caller's JWT through `Authorization: Bearer <token>`, allowing PostgreSQL to automatically enforce Row Level Security (`auth.uid() = user.id`) on all queries.
- **Multi-Tenant Organization Verification (`middleware/orgContext.js`):** Validates the tenant header (`X-Org-Id`) against the `organization_members` database table to confirm active membership (`status = 'active'`). Attaches verified `req.orgId` and `req.userRole` to the request object.
- **Role-Based Authorization (`requireRole`):** Strictly enforces role permissions mirroring PostgreSQL `has_org_role()`:
  - `owner`: Requires owner role.
  - `admin`: Permitted for owners and administrators.
  - `member`: Permitted for all active organization members.
- **Leads CRUD API (`controllers/leadController.js`):** Complete set of endpoints to list, retrieve, create, update, and delete leads strictly scoped by `organization_id`. Request bodies cannot spoof tenant ownership.
- **Centralized Error Handling (`middleware/errorHandler.js`):** Formats uncaught exceptions into clean, consistent JSON error structures while concealing sensitive database internals and tokens from client responses.

---

## 5. API Documentation

### Base URL
```
http://localhost:5000
```

### Required Headers
For all protected `/api/v1/*` endpoints:
- `Authorization`: `Bearer <supabase_jwt_access_token>` (Required for all `/api/v1` routes)
- `X-Org-Id`: `<organization_uuid>` (Required for `/api/v1/leads/*` routes)

---

### Endpoint Reference

| Method | Endpoint | Description | Access / Role Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health status check | Public |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile | Authenticated user |
| `GET` | `/api/v1/leads` | List all leads for active organization | Active organization member |
| `GET` | `/api/v1/leads/:id` | Retrieve single lead by ID | Active organization member |
| `POST` | `/api/v1/leads` | Create a new lead | Active organization member |
| `PUT` | `/api/v1/leads/:id` | Update an existing lead | Active organization member |
| `DELETE` | `/api/v1/leads/:id` | Delete a lead | Organization Admin or Owner only |

---

### Example API Requests & Responses

#### 1. Health Check
* **Request:** `GET /api/health`
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "IntelliCall Express API is running"
}
```

#### 2. Get Authenticated User
* **Request:** `GET /api/v1/auth/me`
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "e8388910-33d1-419b-bb99-35492167c132",
    "email": "sarah.connor@example.com",
    "name": "Sarah Connor"
  },
  "organization": null
}
```

#### 3. Create a Lead
* **Request:** `POST /api/v1/leads`
* **Headers:**  
  `Authorization: Bearer <token>`  
  `X-Org-Id: a3f88210-63e2-4119-bb01-987654321000`  
  `Content-Type: application/json`
* **Request Body:**
```json
{
  "name": "Michael Scott",
  "company": "Dunder Mifflin",
  "title": "Regional Manager",
  "email": "mscott@dundermifflin.com",
  "phone": "+1-555-0144",
  "status": "new",
  "source": "Outbound Call",
  "estimated_value": 45000,
  "next_action": "Send product overview deck",
  "notes": "Interested in automated sales follow-up"
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "lead": {
    "id": "4b6c9342-9f37-4f4d-bc7b-7e6163351980",
    "organization_id": "a3f88210-63e2-4119-bb01-987654321000",
    "name": "Michael Scott",
    "first_name": "Michael",
    "last_name": "Scott",
    "company": "Dunder Mifflin",
    "title": "Regional Manager",
    "email": "mscott@dundermifflin.com",
    "phone": "+1-555-0144",
    "status": "new",
    "source": "Outbound Call",
    "estimated_value": 45000,
    "next_action": "Send product overview deck",
    "notes": "Interested in automated sales follow-up",
    "created_by": "e8388910-33d1-419b-bb99-35492167c132",
    "created_at": "2026-11-17T10:40:00.000Z",
    "updated_at": "2026-11-17T10:40:00.000Z"
  }
}
```

#### 4. Update a Lead
* **Request:** `PUT /api/v1/leads/4b6c9342-9f37-4f4d-bc7b-7e6163351980`
* **Headers:**  
  `Authorization: Bearer <token>`  
  `X-Org-Id: a3f88210-63e2-4119-bb01-987654321000`  
  `Content-Type: application/json`
* **Request Body:**
```json
{
  "status": "qualified",
  "estimated_value": 60000,
  "next_action": "Schedule executive demo"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "lead": {
    "id": "4b6c9342-9f37-4f4d-bc7b-7e6163351980",
    "status": "qualified",
    "estimated_value": 60000,
    "next_action": "Schedule executive demo",
    "last_activity_at": "2026-11-17T10:42:00.000Z"
  }
}
```

#### 5. Delete a Lead (Restricted to Admin / Owner)
* **Request:** `DELETE /api/v1/leads/4b6c9342-9f37-4f4d-bc7b-7e6163351980`
* **Headers:**  
  `Authorization: Bearer <token>`  
  `X-Org-Id: a3f88210-63e2-4119-bb01-987654321000`
* **Response (200 OK - Admin/Owner):**
```json
{
  "success": true,
  "message": "Lead deleted successfully",
  "lead": {
    "id": "4b6c9342-9f37-4f4d-bc7b-7e6163351980"
  }
}
```
* **Response (403 Forbidden - Regular Member):**
```json
{
  "success": false,
  "message": "Access denied: Admin or owner role required for this action"
}
```

---

## 6. Security Architecture

1. **Bearer Token Authentication:** Every protected endpoint verifies incoming JWTs against Supabase Auth.
2. **Dual-Layer Multi-Tenancy:**
   - **Application Layer:** `requireOrgContext` verifies the caller is an active member of the requested tenant in `organization_members`. Database queries strictly append `.eq('organization_id', req.orgId)`. Any caller-supplied `organization_id` in request payloads is ignored.
   - **Database Layer (RLS):** Queries run through a per-request Supabase client configured with the caller's JWT, activating PostgreSQL Row Level Security policies (`is_org_member(organization_id)`).
3. **Role-Based Authorization (RBAC):** Privileged actions such as lead deletion enforce `requireRole('admin')`, ensuring only users with `admin` or `owner` status can delete records.
4. **Information Disclosure Prevention:** Centralized error handlers mask low-level database errors, SQL state codes, internal traces, and user JWTs from API responses.
5. **No Service-Role Key Abuse:** Normal client requests never use the high-privilege `SUPABASE_SERVICE_ROLE_KEY`. Only public anonymous keys and user-scoped JWTs are utilized.
6. **Zero Hardcoded Secrets:** All credentials are loaded strictly from environment variables. `.env` files are excluded via `.gitignore`.

---

## 7. Environment Setup

### Prerequisites
- Node.js (v18 or higher recommended; verified with v24.x)
- npm (v9 or higher)

### Installation
Clone the repository and install backend dependencies:

```bash
cd backend
npm install
```

### Environment Configuration
Copy the sample environment file and configure your local variables:

```bash
cp .env.example .env
```

`backend/.env.example` defines the required variables:

```ini
# Express Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173

# Supabase Project Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-public-anon-key
```

> **Note:** Never commit `.env` files or real production credentials to source control.

---

## 8. Running the Backend

From the `backend/` directory:

### Development Mode (with automatic restart on file change)
```bash
npm run dev
```
*(Runs `nodemon server.js` on port `5000`)*

### Production Mode
```bash
npm start
```
*(Runs `node server.js`)*

To verify server execution, send a GET request:
```bash
curl http://localhost:5000/api/health
```

---

## 9. Testing and Verification

The Express backend has been validated across two comprehensive verification suites:

- **Phase 2 Authentication & Security Suite:** **38 / 38 passed**
  - Missing environment variable fail-fast detection.
  - Valid client initialization without placeholder fallbacks.
  - 401 handling for missing, malformed, and invalid JWTs.
  - 503 handling for network/infrastructure failures without token exposure.
  - 403 handling for missing or inactive organization memberships.
  - 500/503 differentiation for database connection and query failures.
  - Full RBAC matrix validation for `owner`, `admin`, and `member` roles.
  - 500 rejection for unsupported role arguments.
  - Successful user context and RLS-scoped client attachment.

- **Phase 3 Leads CRUD & RBAC Suite:** **25 / 25 passed**
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

> **Verification Distinction Notice:** The test runs above represent automated mock and local loopback integration verification tests. End-to-end integration testing against a live Supabase Cloud database project remains pending until live Supabase project credentials are provisioned in `.env`.

---

## 10. Git Branch Information

- **Current Active Branch:** `express-backend`
- This branch maintains the Node.js + Express.js backend implementation for the academic Full Stack Development (FSD) demonstration, leaving the existing React frontend, database migrations, and original `main` branch intact.

---

## Scope & Separation Policy

This repository is maintained for non-proprietary application assets:
- Frontend client application code
- Express backend APIs, controllers, and middleware
- Database schema and migrations
- Deployment configurations and documentation

Proprietary AI Voice Worker core logic is isolated in external packages and maintained separately.
