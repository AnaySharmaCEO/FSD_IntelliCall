# IntelliCall — Express.js REST API Documentation

> **Official API Specification**  
> **Base URL:** `/api/v1`  
> **Server:** Express.js (Node.js) on Port 5000

---

## 🔐 1. Authentication & Security Model

All private endpoints require two headers:
1. `Authorization: Bearer <supabase_jwt>`
2. `X-Org-Id: <organization_uuid>`

---

## 📡 2. API Routes Directory

### 2.1 Authentication & Workspace (`/api/v1/auth`, `/api/v1/organizations`)
* `GET /api/v1/auth/me`: Returns verified identity of the authenticated user.
* `GET /api/v1/organizations/current`: Fetches active organization profile and settings.
* `PUT /api/v1/organizations/current`: Updates workspace branding and configuration (Admin/Owner).
* `GET /api/v1/organizations/members`: Lists all members and assigned RBAC roles.
* `POST /api/v1/organizations/members/invite`: Invites a team member by email.

### 2.2 Prospect Pipeline (`/api/v1/leads`)
* `GET /api/v1/leads`: Lists leads belonging to the active organization.
* `POST /api/v1/leads`: Creates a new lead.
* `POST /api/v1/leads/bulk`: Batch imports prospect arrays with phone normalization.
* `GET /api/v1/leads/:id`: Retrieves detailed prospect profile and timeline.
* `PUT /api/v1/leads/:id`: Updates prospect status, estimated value, and next action.
* `DELETE /api/v1/leads/:id`: Deletes lead (Admin/Owner).

### 2.3 AI Personas & Campaigns (`/api/v1/agents`, `/api/v1/campaigns`)
* `GET /api/v1/agents`: Lists AI conversational personas (neural voices, brevity rules).
* `POST /api/v1/agents`: Creates a new persona with system prompt and tactics.
* `GET /api/v1/campaigns`: Lists outbound campaigns with dialing hours and daily budgets.
* `POST /api/v1/campaigns`: Creates a new campaign with objection playbooks.

### 2.4 Calls, Transcripts & Audio (`/api/v1/calls`, `/api/v1/storage`)
* `GET /api/v1/calls`: Lists call history with pagination and status/sentiment filters.
* `POST /api/v1/calls`: Creates or schedules an outbound call.
* `GET /api/v1/calls/:id`: Retrieves call details, telemetry, and linked decision.
* `GET /api/v1/calls/:id/transcript`: Returns ordered conversational dialogue turns.
* `GET /api/v1/calls/:id/analysis`: Returns post-call Gemini analysis.
* `POST /api/v1/calls/:id/trigger-analysis`: Triggers post-call Gemini intelligence analysis.
* `POST /api/v1/calls/dispatch-scheduled`: Dispatches due scheduled calls.
* `GET /api/v1/storage/recordings/:callId/signed-url`: Generates signed download URL for audio recording.

### 2.5 Decisions & Supervisor Review (`/api/v1/decisions`)
* `GET /api/v1/decisions`: Lists decisions (supports review queue filtering via `outcome=review_required`).
* `GET /api/v1/decisions/:id`: Returns decision with grounded verbatim evidence citations.
* `POST /api/v1/decisions/:id/review`: Supervisor approval or override of model decision.

### 2.6 Appointments & Compliance (`/api/v1/appointments`, `/api/v1/compliance`, `/api/v1/phone-numbers`)
* `GET /api/v1/appointments`: Lists scheduled callbacks and consultations.
* `POST /api/v1/appointments`: Books a callback consultation.
* `GET /api/v1/compliance`: Lists active regulatory phrase rules.
* `POST /api/v1/compliance`: Creates regulatory rules and breach actions.
* `GET /api/v1/phone-numbers`: Lists provisioned telephony trunks.

### 2.7 Inbound Webhooks (`/api/v1/webhooks`)
* `POST /api/v1/webhooks/calls`: Ingests telephony lifecycle and transcript events.
* `POST /api/v1/webhooks/appointments`: Ingests calendar booking webhooks (Calendly).

### 2.8 Post-Call AI Intelligence (`/api/v1/ai`)
* `POST /api/v1/ai/analysis/run`: Runs Google Gemini 2.0 Flash structured JSON extraction.
* `POST /api/v1/ai/decisions/process`: Runs conversational decision scoring engine.


---

## 📋 3. Example API Requests & Responses

### 3.1 Health Check
* **Request:** `GET /api/health`
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "IntelliCall Express API is running",
  "version": "2.0.0",
  "timestamp": "2026-11-17T10:35:00.000Z"
}
```

### 3.2 Get Authenticated User Identity
* **Request:** `GET /api/v1/auth/me`
* **Headers:** `Authorization: Bearer <supabase_jwt>`
* **Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "e8388910-33d1-419b-bb99-35492167c132",
    "email": "anay.sharma@example.com",
    "name": "Anay Sharma"
  },
  "organization": null
}
```

### 3.3 Create a Lead
* **Request:** `POST /api/v1/leads`
* **Headers:**  
  `Authorization: Bearer <supabase_jwt>`  
  `X-Org-Id: a3f88210-63e2-4119-bb01-987654321000`  
  `Content-Type: application/json`
* **Body:**
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

### 3.4 Update a Lead
* **Request:** `PUT /api/v1/leads/4b6c9342-9f37-4f4d-bc7b-7e6163351980`
* **Headers:**  
  `Authorization: Bearer <supabase_jwt>`  
  `X-Org-Id: a3f88210-63e2-4119-bb01-987654321000`  
  `Content-Type: application/json`
* **Body:**
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

### 3.5 Delete a Lead (Restricted to Admin / Owner)
* **Request:** `DELETE /api/v1/leads/4b6c9342-9f37-4f4d-bc7b-7e6163351980`
* **Headers:**  
  `Authorization: Bearer <supabase_jwt>`  
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
