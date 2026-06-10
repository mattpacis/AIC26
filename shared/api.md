# API Contract

Shared contract between `frontend/` and `backend/`. The backend is the source of truth; Copilot will call the same service layer later through approved action endpoints.

**Microsoft Copilot team:** read [`copilot-integration.md`](./copilot-integration.md) for agent rules, tool catalog, and connection architecture. OpenAPI sketch for Custom Connectors: [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml).

Base URL (dev): `http://localhost:3001`  
Frontend proxy: `/api` → backend  
All authenticated requests use cookie sessions (`credentials: 'include'`).

---

## GET /api/health

Health check.

**Response 200**

```json
{ "status": "ok" }
```

---

## POST /api/auth/login

Sign in and create a session cookie.

**Request**

```json
{
  "email": "alex.johnson@university.edu",
  "password": "campus360"
}
```

**Response 200**

```json
{
  "user": {
    "id": "…",
    "email": "alex.johnson@university.edu",
    "name": "Alex Johnson",
    "role": "student"
  }
}
```

---

## POST /api/auth/logout

Destroy the current session.

**Response 200**

```json
{ "ok": true }
```

---

## GET /api/me

Return the current authenticated user.

**Response 200**

```json
{
  "user": {
    "id": "…",
    "email": "alex.johnson@university.edu",
    "name": "Alex Johnson",
    "role": "student",
    "school": { "id": "…", "name": "Campus360 University" },
    "student": { "id": "…", "grade": "Grade 10" }
  }
}
```

---

## GET /api/dashboard

Dashboard summary for the signed-in user.

**Response 200**

```json
{
  "user": { "…": "same shape as /api/me" },
  "summary": {
    "openTicketCount": 0,
    "pendingActionCount": 0,
    "chatThreadCount": 1
  }
}
```

---

## GET /api/tickets

List tickets for the current user. Students see only their own tickets. Staff see all tickets in their school.

**Response 200**

```json
{
  "tickets": [
    {
      "id": "#12293031",
      "ticketNumber": "12293031",
      "concern": "Library Wi-Fi outage",
      "status": "progress",
      "statusLabel": "In Progress",
      "urgency": "med",
      "urgencyLabel": "Medium",
      "department": "IT Department",
      "lastUpdate": "Sep. 7, 2026",
      "updatedAt": "2026-09-07T09:45:00.000Z"
    }
  ]
}
```

---

## GET /api/tickets/:ticketNumber

Get ticket detail by ticket number (without `#` prefix in the URL).

**Response 200** — `{ "ticket": { … } }` with `trackSteps`, `aiUpdates`, `timeline`, and `related`.

---

## POST /api/tickets

Create a ticket. Students can only create tickets for themselves.

**Request**

```json
{
  "concern": "Library Wi-Fi outage",
  "department": "IT Department",
  "description": "Wi-Fi is down in the Main Library",
  "urgency": "MEDIUM"
}
```

**Response 201** — ticket detail object.

---

## PATCH /api/tickets/:ticketNumber/status

Update ticket status. Staff/admin only.

**Request**

```json
{ "status": "IN_PROGRESS" }
```

---

## GET /api/appointments

List appointments for the current user. Students see only their own appointments.

**Query params (optional)**

| Param | Values |
|-------|--------|
| `status` | `all`, `upcoming`, `completed` |
| `year`, `month`, `day` | Filter by calendar date (`month` is 0-based) |

**Response 200**

```json
{
  "appointments": [
    {
      "id": "…",
      "title": "Registrar — transcript pickup",
      "department": "Registrar",
      "status": "upcoming",
      "scheduledAt": "2026-09-17T14:00:00.000Z",
      "date": "Sep 17, 2026",
      "time": "2:00 PM",
      "location": "Admin Building, Room 201",
      "barColor": "#2E5BA8",
      "details": [{ "label": "Department", "value": "Registrar" }],
      "bringItems": ["Valid school ID"],
      "miniSub": "Sep 17 · 2:00 PM · Admin Building, Room 201"
    }
  ]
}
```

---

## GET /api/appointments/summary

Counts and next-appointment reminder for the current user.

**Response 200**

```json
{
  "summary": {
    "upcomingCount": 3,
    "completedCount": 1,
    "nextAppointment": { "label": "Sep 17", "title": "Registrar — transcript pickup" },
    "reminder": "Reminder: Registrar — transcript pickup on Sep 17, 2026 at 2:00 PM, Admin Building, Room 201"
  }
}
```

---

## GET /api/appointments/:appointmentId

Get a single appointment by id.

**Response 200** — `{ "appointment": { … } }`

---

## POST /api/appointments

Request a new appointment. Students can only create appointments for themselves.

**Request**

```json
{
  "title": "Guidance counseling session",
  "department": "Guidance Office",
  "purpose": "Course selection advice",
  "location": "Counseling Center",
  "scheduledAt": "2026-09-20T10:00:00.000Z"
}
```

**Response 201** — `{ "appointment": { … } }`

---

## PATCH /api/appointments/:appointmentId/reschedule

Reschedule an upcoming appointment.

**Request**

```json
{ "scheduledAt": "2026-09-21T11:00:00.000Z" }
```

**Response 200** — `{ "appointment": { … } }`

---

## PATCH /api/appointments/:appointmentId/cancel

Cancel an upcoming appointment.

**Response 200** — `{ "appointment": { … } }` with `status: "cancelled"`

---

## GET /api/chat/threads

List chat threads for the current user.

**Response 200**

```json
{
  "threads": [
    {
      "id": "…",
      "title": "AI Helpdesk",
      "updatedAt": "2026-06-08T12:00:00.000Z",
      "lastMessage": {
        "id": "…",
        "sender": "assistant",
        "content": "Hi! I'm your Campus360 AI…",
        "createdAt": "2026-06-08T12:00:00.000Z"
      }
    }
  ]
}
```

---

## POST /api/chat/threads

Create a new chat thread (includes an assistant greeting).

**Request**

```json
{ "title": "AI Helpdesk" }
```

**Response 201**

```json
{
  "thread": { "id": "…", "title": "AI Helpdesk", "updatedAt": "…" },
  "messages": [
    {
      "id": "…",
      "sender": "assistant",
      "content": "Hi! I'm your Campus360 AI…",
      "createdAt": "…"
    }
  ]
}
```

---

## GET /api/chat/threads/:threadId/messages

Load messages for a thread.

**Response 200**

```json
{
  "messages": [
    {
      "id": "…",
      "sender": "user",
      "content": "Hello",
      "createdAt": "…"
    }
  ]
}
```

---

## POST /api/chat/messages

Send a chat message. Creates a thread automatically if `threadId` is omitted.

**Request**

```json
{
  "message": "Hello",
  "threadId": "optional-thread-id"
}
```

**Response 200**

```json
{
  "threadId": "…",
  "reply": "Placeholder assistant response",
  "sessionId": "…",
  "messages": [
    { "id": "…", "sender": "user", "content": "Hello", "createdAt": "…" },
    { "id": "…", "sender": "assistant", "content": "…", "createdAt": "…" }
  ]
}
```

---

## Agent bridge (Microsoft Copilot)

Server-to-server endpoints for Copilot Studio Custom Connectors. **Not for browser cookies** — use API key + user id headers.

**Auth headers (required)**

```http
Authorization: Bearer <CAMPUS360_AGENT_API_KEY>
X-Campus360-User-Id: <campus360-user-id>
```

Dev key (default in development): `campus360-dev-agent-key`

**Handoff doc for agent teammates:** [`copilot-handoff.md`](./copilot-handoff.md)

### GET /api/agent/health

```json
{
  "status": "ok",
  "agentMode": "dev_bridge",
  "agentContractVersion": "1.0"
}
```

`agentMode` is `microsoft` when `MICROSOFT_AGENT_ENDPOINT` is set in backend env.

### GET /api/agent/tools

List allow-listed tool names.

### GET /api/agent/context

Student snapshot for the agent (profile, holds, ticket summary, next appointment).

**Query:** `threadId` (optional)

**Response 200**

```json
{
  "context": {
    "agentContractVersion": "1.0",
    "agentMode": "dev_bridge",
    "user": { "name": "Alex Johnson", "role": "student" },
    "summary": {
      "openTicketCount": 3,
      "activeHoldCount": 2,
      "upcomingAppointmentCount": 3,
      "nextAppointment": { "title": "…", "date": "…", "time": "…" }
    },
    "holds": [{ "label": "Tuition hold — ₱18,400 unpaid", "department": "Cashier Office" }],
    "recentTickets": [],
    "threadId": null
  }
}
```

### POST /api/agent/tools/:toolName

Execute an allow-listed tool. Body fields depend on the tool (see [`copilot-handoff.md`](./copilot-handoff.md)).

**Example:** `POST /api/agent/tools/list_holds` with `{}`

**Response 200**

```json
{ "tool": "list_holds", "ok": true, "holds": [], "summary": {} }
```

---

## POST /api/chat/messages (agent mode)

When a student sends a message, the backend:

1. Loads auth context
2. Calls `agentProvider` (`dev_bridge` or `MICROSOFT_AGENT_ENDPOINT`)
3. Stores and returns the assistant reply

**Response 200** includes `agentMode`: `"dev_bridge"` | `"microsoft"`

---

## POST /api/chat (legacy)

Kept for backward compatibility. Prefer `POST /api/chat/messages`.

**Request / response** — same as the original contract (`message`, optional `sessionId` → `reply`, `sessionId`).

---

## Staff / personnel APIs

All routes below require an authenticated **staff** or **admin** session (`staff@university.edu` in dev). Students receive `403`.

### GET /api/staff/dashboard

Staff home summary: queue counts, today’s appointments, and a queue preview.

**Response 200**

```json
{
  "user": {
    "id": "…",
    "name": "Maria Reyes",
    "email": "staff@university.edu",
    "role": "staff",
    "initials": "MR",
    "department": "Campus Health",
    "roleLabel": "Campus Health · Staff"
  },
  "summary": {
    "queueCount": 3,
    "openCount": 1,
    "scheduledCount": 1,
    "progressCount": 1,
    "resolvedCount": 1,
    "todayAppointmentCount": 0
  },
  "todayAppointments": [],
  "queuePreview": []
}
```

`queuePreview` items use the staff queue ticket shape (see below).

---

### GET /api/staff/tickets

List tickets for the staff queue.

**Query (optional)**

| Param | Values |
|-------|--------|
| `status` | `all`, `open`, `progress`, `sched`, `resolved` |
| `urgency` | `all`, `low`, `med`, `high` |
| `department` | Department name |

**Response 200**

```json
{
  "tickets": [
    {
      "id": "#12295006",
      "ticketNumber": "12295006",
      "concern": "Medical certificate — NSTP",
      "studentName": "Alex Johnson",
      "studentEmail": "alex.johnson@university.edu",
      "status": "sched",
      "statusLabel": "Scheduled",
      "urgency": "low",
      "urgencyLabel": "Low",
      "aiTriaged": true,
      "aiSummary": "…",
      "staffNotes": null,
      "student": {
        "initials": "AJ",
        "program": "BS Computer Science",
        "studentId": "2024-10882",
        "tags": [],
        "ticketsThisSem": 4
      },
      "info": {
        "purpose": "Medical certificate request — NSTP clearance",
        "deadline": "Sep 19, 2026",
        "appointment": "Sept 10 · 9:00 AM",
        "assignedTo": "Maria Reyes"
      },
      "steps": [{ "text": "…", "tag": "current" }]
    }
  ]
}
```

---

### GET /api/staff/tickets/:ticketNumber

Staff ticket detail: standard ticket detail plus a `queue` object (staff queue shape).

**Response 200** — `{ "ticket": { …, "queue": { … } } }`

---

### PATCH /api/staff/tickets/:ticketNumber

Update assignment, status, or internal staff notes.

**Request**

```json
{
  "status": "RESOLVED",
  "assignedTo": "Maria Reyes",
  "staffNotes": "Certificate issued and uploaded to BluePHR."
}
```

All fields optional.

**Response 200** — `{ "ticket": { … } }`

---

### POST /api/staff/tickets/:ticketNumber/replies

Post a staff reply (same storage as student replies; timeline shows “Staff follow-up”).

**Request**

```json
{ "content": "Please bring your NSTP form on visit day." }
```

**Response 201** — `{ "ticket": { … } }`

---

### GET /api/staff/students

Searchable student roster for staff.

**Query (optional)**

| Param | Description |
|-------|-------------|
| `holds=true` | Only students with active holds |
| `openTickets=true` | Only students with open tickets |
| `yearLevel` | Substring match |
| `program` | Substring match |

**Response 200**

```json
{
  "students": [
    {
      "id": "2024-10882",
      "userId": "…",
      "initials": "AJ",
      "name": "Alex Johnson",
      "email": "alex.johnson@university.edu",
      "phone": "+63 917 555 0142",
      "yearLevel": "3rd Year",
      "program": "BS Computer Science",
      "college": "College of Engineering",
      "enrollmentStatus": "Enrolled — hold pending",
      "hasHold": true,
      "hasOpenTicket": true,
      "stats": { "tickets": 3, "holds": 2, "appts": 1, "nextAppointment": "…" },
      "listTags": []
    }
  ]
}
```

---

### GET /api/staff/students/:studentKey

Student profile by `studentNumber`, `userId`, or internal student `id`.

**Response 200** — `{ "student": { …, "holds": [], "tickets": [], "appointments": [], "healthNotes": [], "profileTags": [] } }`

---

### GET /api/staff/appointments

School-wide appointments (staff view). Same filters as `GET /api/appointments` (`status`, `year`, `month`, `day`).

**Response 200** — `{ "appointments": [ … ] }`

---

### GET /api/staff/knowledge-base

Department knowledge base articles.

**Query (optional)**

| Param | Description |
|-------|-------------|
| `category` | `procedures`, `forms`, `policies`, or `all` |
| `department` | Department name |
| `aiReferenced=true` | Only AI-referenced articles |
| `search` | Title/description/tag search |

**Response 200**

```json
{
  "articles": [
    {
      "id": "nstp-ch02",
      "slug": "nstp-ch02",
      "title": "How to issue an NSTP medical certificate (Form CH-02)",
      "description": "…",
      "department": "Campus Health",
      "category": "procedures",
      "tags": ["Campus Health", "AI-referenced"],
      "views": 142,
      "readTime": "3 min read",
      "aiReferenced": true
    }
  ]
}
```

---

### GET /api/staff/knowledge-base/:slug

Full article body (increments view count).

**Response 200**

```json
{
  "article": {
    "id": "nstp-ch02",
    "title": "…",
    "overview": ["…"],
    "requirements": ["…"],
    "steps": [{ "text": "…", "tag": "required" }],
    "note": "…",
    "relatedIds": ["bluephr-upload"]
  }
}
```

---

## Environment variables (backend)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3000`) |
| `CORS_ORIGIN` | Allowed frontend origin (default `http://localhost:5173`) |
| `DATABASE_URL` | SQLite/Postgres connection string |
| `SESSION_SECRET` | Cookie signing secret |
| `CAMPUS360_AGENT_API_KEY` | Bearer token for `/api/agent/*` (dev default: `campus360-dev-agent-key`) |
| `MICROSOFT_AGENT_ENDPOINT` | When set, chat forwards turns to Microsoft; enables `agentMode: microsoft` |
| `MICROSOFT_AGENT_API_KEY` | Optional Bearer sent to Microsoft endpoint |

---

## Seed users (dev)

| Email | Password | Role |
|-------|----------|------|
| `alex.johnson@university.edu` | `campus360` | student |
| `staff@university.edu` | `campus360` | staff |
