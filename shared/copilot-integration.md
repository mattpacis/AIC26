# Campus360 × Microsoft Copilot — Integration Guidelines

**Audience:** teammates building the Microsoft Copilot / Copilot Studio agent  
**Owner (app + API):** frontend/backend team  
**Status:** living document — update this when APIs or tools change

---

## 1. Big picture

Campus360 is split into two halves that must stay in sync:

| Team | Owns | Does **not** own |
|------|------|------------------|
| **App team** (frontend + backend) | Database, business rules, permissions, REST API, student/staff UI, audit logs | Copilot conversation design, Microsoft platform config |
| **Agent team** (Microsoft Copilot) | Conversation flows, tone, intent recognition, when to call tools, escalation copy | Direct database access, duplicating business logic in the agent |

```text
Student browser
      │
      ▼
Campus360 frontend (React)
      │  cookie session
      ▼
Campus360 backend (Express)  ◄───────┐
      │                               │
      │  agent API call               │  tool calls (HTTP)
      ▼                               │
Microsoft Copilot / Copilot Studio ───┘
```

### Golden rules (non‑negotiable)

1. **The backend is the only source of truth.** All reads/writes go through `backend/src/services/*`.
2. **Copilot never connects to SQLite/Postgres.** No Prisma, no raw SQL, no duplicate data stores.
3. **Copilot never holds student secrets** (passwords, session cookies in prompts, API keys in topics).
4. **Every write action must be logged** — the app team will route tool calls through services that call `logAction`.
5. **Students only see/act on their own data.** Staff see school-wide data. The backend enforces this; the agent must not try to bypass it.
6. **If a tool/API does not exist yet, the agent must not pretend it worked.** Say “I can’t do that yet” or offer a manual next step.
7. **`shared/api.md` + this file are the contract.** If you need a new capability, open an issue / tell the app team — don’t invent endpoints.

---

## 2. How the two sides will connect (recommended)

You do **not** need the final Microsoft wiring on day one. This is the target architecture everyone should build toward.

### Target flow (embedded helpdesk in the app)

1. Student is logged into Campus360 (cookie session).
2. Student sends a message in **AI Helpdesk** (`POST /api/chat/messages`).
3. **Backend** loads user context (`userId`, `schoolId`, `role`, holds, open tickets summary).
4. **Backend** forwards the message to **Microsoft Copilot** (Direct Line, Copilot Studio, or Azure OpenAI with tools).
5. If the agent needs data or wants to perform an action, it calls **Campus360 tool endpoints** (see §5).  
   - Tool calls are made **server-to-server** (backend ↔ Microsoft), or via a **Custom Connector** that hits the backend with a service API key + user id.
6. Backend executes the tool via existing services, returns JSON to the agent.
7. Agent composes a natural-language reply; backend stores assistant message in `ChatMessage` and returns it to the UI.

```text
POST /api/chat/messages
        │
        ├─► build AgentContext (who is this student?)
        ├─► call Microsoft agent with context + message
        │         │
        │         └─► (optional) POST /api/agent/tools/...
        │
        └─► save assistant reply → return to frontend
```

### What the agent team configures in Microsoft

- **Copilot Studio bot** (or equivalent) with topics/skills aligned to §4.
- **Custom connector** or **Power Automate flow** for each tool in §5 (once exposed).
- **Authentication** to Campus360 tool APIs via API key / managed identity (app team provides dev credentials).
- **System instructions** that reference this doc (allowed tools, tone, safety).

### What the app team will provide (roadmap)

| Deliverable | Purpose |
|-------------|---------|
| `GET /api/agent/context` | One-shot student snapshot for the agent (profile, holds, ticket/appointment summaries) |
| `POST /api/agent/tools/:toolName` | Executes an allow-listed action with validation + audit log |
| `agentProvider` in backend | Replaces placeholder replies in `chatService.ts` |
| Dev API key in `.env` | Lets Copilot Studio call tools in local/staging |

**Handoff for agent teammates:** [`copilot-handoff.md`](./copilot-handoff.md)

Until Microsoft is configured, the app runs in **`dev_bridge`** mode (live data, no Copilot Studio required). Use real tool endpoints for connector development — not mocks.

---

## 3. Division of responsibilities

### Agent team — build this

- [ ] Conversation design (greeting, clarifying questions, confirmations).
- [ ] Topic/skill map (§4) implemented in Copilot Studio.
- [ ] Tool **intents** — when to call `create_ticket` vs `list_appointments`, etc.
- [ ] **Confirmation UX** before destructive or important writes (cancel ticket, book slot).
- [ ] **Failure copy** when API returns 4xx/5xx (user-friendly, no stack traces).
- [ ] **Out-of-scope** handling (medical advice, legal advice, grades not in API → defer to office).
- [ ] Test scripts / evaluation sets (sample student utterances → expected tool or reply).
- [ ] Microsoft-side docs: bot name, environment URLs, connector OpenAPI specs.

### App team — build this

- [ ] REST API + Prisma schema (done for core student flows).
- [ ] Service layer + permissions (done).
- [x] Agent tool routes + `agentProvider` (done — see `copilot-handoff.md`).
- [ ] Pending-action approval flow for high-risk writes (planned).
- [ ] `shared/api.md` kept up to date.

### Shared — decide together

- [ ] Final list of v1 tools (§5).
- [ ] Which writes require **explicit student confirmation** in the UI vs in-chat only.
- [ ] Copilot product choice (Copilot Studio vs Azure OpenAI function calling vs Bot Framework).
- [ ] Staging URLs and test accounts.

---

## 4. Recommended agent structure (Copilot Studio)

Organize the bot into **topics** (or skills). Each topic should know which **tools** it may use.

### Core topics

| Topic | Goal | Example utterances | Tools (read) | Tools (write) |
|-------|------|--------------------|--------------|---------------|
| **Greeting & scope** | Set expectations, privacy | “What can you help with?” | `get_context` | — |
| **Tickets** | Status, create, follow-up | “Wi‑Fi is down in the library” | `list_tickets`, `get_ticket` | `create_ticket`, `add_ticket_reply` |
| **Appointments** | View, book, reschedule | “Book Campus Health next week” | `list_appointments`, `get_availability` | `request_appointment`, `reschedule_appointment`, `cancel_appointment` |
| **Holds** | Explain blocks | “Why is my account on hold?” | `list_holds` | — (clears are staff/cashier systems) |
| **Handoff / safety** | Escalation | “I want a human” | `get_context` | — (future: `escalate_to_staff`) |

### Conversation patterns (required)

**Pattern A — Read-only**  
User asks → agent calls read tool → summarizes result.

**Pattern B — Write with confirmation**  
User asks → agent gathers slots (department, date, concern) → agent proposes action in plain language → user confirms (“yes”) → agent calls write tool → agent confirms outcome with IDs/dates.

**Pattern C — Cannot comply**  
Missing API, permission denied, or ambiguous input → ask one clarifying question or explain limitation.

### Tone & persona

- Name: **Campus360 AI** (matches UI badge).
- Voice: helpful, concise, campus-specific; not overly casual.
- Always mention **department** and **ticket number** / **appointment date** when created.
- Never invent ticket numbers, appointment times, or hold amounts.

---

## 5. Tool catalog (v1)

These map to existing or planned backend capabilities. **Parameter names must match** when connectors are built.

### Authentication for tool calls

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <CAMPUS360_AGENT_API_KEY>` (app team issues) |
| `X-Campus360-User-Id` | Student/staff user id from session context |
| `Content-Type` | `application/json` |

The backend builds `AuthContext` from these headers — same permission rules as the UI.

### Read tools (safe to call freely)

| Tool name | HTTP (current/planned) | Purpose |
|-----------|------------------------|---------|
| `get_context` | `GET /api/agent/context` or `POST /api/agent/tools/get_context` | Profile, holds count, open tickets, next appointment |
| `get_me` | `GET /api/me` | Logged-in user |
| `list_tickets` | `GET /api/tickets` | Student’s tickets |
| `get_ticket` | `GET /api/tickets/:ticketNumber` | One ticket detail |
| `list_appointments` | `GET /api/appointments?status=upcoming` | Upcoming appointments |
| `get_appointment_summary` | `GET /api/appointments/summary` | Counts + next appointment |
| `get_availability` | `GET /api/appointments/availability?department&year&month` | Bookable slots |
| `list_holds` | `GET /api/holds` | Active holds |
| `list_departments` | `GET /api/appointments/departments` | For booking dropdowns |

### Write tools (require confirmation in conversation)

| Tool name | HTTP (current) | Notes |
|-----------|----------------|-------|
| `create_ticket` | `POST /api/tickets` | Needs `concern`, `department`; optional `description`, `urgency` |
| `add_ticket_reply` | `POST /api/tickets/:ticketNumber/replies` | Body: `{ "content": "..." }` |
| `cancel_ticket` | `POST /api/tickets/:ticketNumber/cancel` | Student’s own open tickets only |
| `request_appointment` | `POST /api/appointments` | `scheduledAt` must be an available slot |
| `reschedule_appointment` | `PATCH /api/appointments/:id/reschedule` | Same slot rules |
| `cancel_appointment` | `PATCH /api/appointments/:id/cancel` | |

### Staff-only (agent should not expose to students)

| Tool | HTTP | Role |
|------|------|------|
| `update_ticket_status` | `PATCH /api/tickets/:ticketNumber/status` | staff/admin |

---

## 6. Tool request/response shapes (examples)

Use these when building Custom Connector definitions.

### `create_ticket`

**Request**

```json
{
  "concern": "Library Wi-Fi outage",
  "department": "IT Department",
  "description": "Cannot connect on 2nd floor",
  "urgency": "MEDIUM"
}
```

**Response** — `201`, body `{ "ticket": { "ticketNumber": "12293031", "id": "#12293031", ... } }`

**Agent should say:** “I created ticket **#12293031** and routed it to **IT Department**.”

### `get_availability`

**Request** (query params): `department=Campus Health&year=2026&month=8`

**Response**

```json
{
  "availability": {
    "department": "Campus Health",
    "availableDays": [10, 12, 17],
    "slots": [
      { "id": "…", "startsAt": "2026-09-10T09:00:00.000Z", "timeLabel": "9:00 AM", "day": 10 }
    ]
  }
}
```

**Agent rule:** only offer times returned in `slots`. Never invent times.

### Standard error shape

```json
{ "error": "Human-readable message" }
```

| Code | Agent behavior |
|------|----------------|
| 400 | Ask user to fix input (bad department, slot taken) |
| 401 / 403 | “You’re not allowed to do that” — do not retry |
| 404 | “I couldn’t find that ticket/appointment” |
| 500 | Apologize, suggest trying again or contacting support |

---

## 7. Student context package (what to pass the agent)

When the backend calls Microsoft, it should pass a **context object** (not the full DB). Agent team: design prompts assuming this shape:

```json
{
  "user": {
    "id": "cuid",
    "name": "Alex Johnson",
    "email": "alex.johnson@university.edu",
    "role": "student",
    "school": { "name": "Campus360 University" },
    "grade": "Grade 10"
  },
  "summary": {
    "openTicketCount": 2,
    "activeHoldCount": 2,
    "upcomingAppointmentCount": 3,
    "nextAppointment": { "title": "Campus Health — Medical certificate", "date": "Sep 10, 2026", "time": "9:00 AM" }
  },
  "holds": [
    { "label": "Tuition hold — ₱18,400 unpaid", "department": "Cashier Office" }
  ],
  "threadId": "chat-thread-cuid"
}
```

Use this to personalize greetings and avoid redundant tool calls.

---

## 8. Departments (canonical strings)

Use **exact labels** in tools — backend normalizes some variants, but connectors should use these:

| Label | Use for |
|-------|---------|
| `IT Department` | Tech issues |
| `Registrar's Office` | Enrollment, ID, transcripts |
| `Campus Health` | Medical, PE, certificates |
| `Cashier Office` | Tuition, payments, holds |
| `Student Services` | Guidance / counseling |
| `Library` | Library services |
| `Facilities` | Buildings, maintenance |

---

## 9. Local development & testing

### Test accounts (seed data)

| Email | Password | Role |
|-------|----------|------|
| `alex.johnson@university.edu` | `campus360` | student |
| `staff@university.edu` | `campus360` | staff |

### Running the app backend

```bash
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run dev
# → http://localhost:3001
```

### Testing tools without the UI

```bash
# Health
curl http://localhost:3001/api/health

# Login (save cookie)
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alex.johnson@university.edu","password":"campus360"}'

# List tickets
curl -b cookies.txt http://localhost:3001/api/tickets
```

For Copilot Studio connectors, the app team will provide an **agent API key** that maps `X-Campus360-User-Id` to the same permissions.

### Agent team test checklist

- [ ] Greeting uses student first name when context provided.
- [ ] Creating a ticket returns a real `ticketNumber` from API (not fabricated).
- [ ] Booking offers only `get_availability` slots.
- [ ] Hold questions call `list_holds` — amounts match API.
- [ ] After “cancel my ticket”, agent confirms and calls `cancel_ticket`.
- [ ] Staff-only actions are refused for student role.
- [ ] Errors from API are shown honestly.

---

## 10. Versioning & communication

1. **API changes** → app team updates `shared/api.md` and pings agent team.
2. **New tool needed** → agent team adds a row to §5 in a PR or Slack message; app team implements and documents.
3. **Breaking changes** → bump `agentContractVersion` in context payload (e.g. `"agentContractVersion": "1.0"`).
4. **Weekly sync agenda (15 min):**
   - New tools shipped?
   - Blocked intents?
   - Sample conversations that failed?

---

## 11. Security & privacy

- Do not log full message content in Microsoft analytics if it contains PII — follow school policy.
- Minimize data sent to the model: context package (§7), not full ticket history, unless needed for the turn.
- Writes that affect money, enrollment, or medical scheduling → **always confirm** with the student.
- Agent must not request passwords or OTPs in chat.

---

## 12. Current gaps (honest status)

| Item | Status |
|------|--------|
| Student UI + REST API (tickets, appointments, holds, chat storage) | **Done** |
| `GET /api/agent/context` | **Done** |
| `POST /api/agent/tools/*` + API key auth | **Done** |
| `agentProvider` + dev bridge mode | **Done** |
| `MICROSOFT_AGENT_ENDPOINT` (live Copilot) | **Optional** — set when bot/flow URL exists |
| Copilot Studio topics + connectors | **Agent team** |
| Pending-action approval in UI | **Planned** |

---

## 13. Quick reference — file map (app repo)

```text
shared/api.md              ← HTTP contract (UI + tools)
shared/copilot-integration.md  ← this document
backend/src/services/      ← business logic (tools call these)
backend/src/routes/        ← HTTP handlers
backend/src/lib/permissions.ts ← role/school checks
backend/prisma/schema.prisma   ← database models
frontend/src/pages/StudentDashboard.tsx ← AI Helpdesk UI
```

---

## 14. Questions?

- **App / API:** person owning `backend/` and `frontend/`
- **Agent / Microsoft:** person owning Copilot Studio + connectors
- **Contract disputes:** `shared/api.md` wins for HTTP; this doc wins for process and agent behavior

When in doubt: **read from the API, write through the API, never around it.**
