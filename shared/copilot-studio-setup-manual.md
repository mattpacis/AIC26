# Campus360 × Copilot Studio — Tool setup manual

**Audience:** teammates wiring the Campus360 custom connector in Copilot Studio  
**Prerequisite:** backend running + ngrok tunnel (if Studio is in the cloud)

> **Connector 404/500?** Use the short fix guide: [`copilot-studio-v04-fix.md`](./copilot-studio-v04-fix.md)  
> Import OpenAPI **v0.2.0** and use **only** `invoke_agent_tool` in the agent.

---

## 0. Before you touch Copilot Studio

### Start the backend

```bash
cd backend
npm run dev
# → http://localhost:3001
```

### Expose it to the cloud (required for Copilot Studio)

```bash
cd backend
npm run ngrok
```

Copy the printed **Copilot base URL**, e.g. `https://abc123.ngrok-free.app/api`

> Free ngrok URLs change every restart — update the connector when that happens.

### Verify the bridge

```bash
cd backend
npm run verify:agent
```

This prints Alex’s user id and tests `list_holds`.

### Test account

| Email | Password |
|-------|----------|
| `alex.johnson@university.edu` | `campus360` |

Alex has **4 tickets**, **2 holds**, and **3 upcoming appointments** in seed data.

---

## 1. Create / import the custom connector

1. Power Platform → **Custom connectors** → **New custom connector** → **Import an OpenAPI file**
2. Upload [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml)
3. Set **Host** to your ngrok host only (no path), e.g. `abc123.ngrok-free.app`
4. Set **Base URL** to `/api`
5. **General** → name it `Campus360`

### Security (connection screen)

| Field | Value |
|-------|--------|
| Authentication type | **No authentication** |

Headers are **not** set on the connection screen. They go in **Policies** (next section).

---

## 2. Connector policies (required headers)

Open the connector → **Definition** → **Policies** → **New policy** → **Set HTTP header**  
Run on: **Request** · Action if header exists: **Override**

| Header | Value | Notes |
|--------|--------|--------|
| `Authorization` | `Bearer campus360-dev-agent-key` | Dev key from `backend/.env` |
| `ngrok-skip-browser-warning` | `1` | Stops ngrok HTML interstitial |
| `X-Campus360-User-Id` | **Dynamic** — see §3 | Do **not** hardcode in production |
| `X-Campus360-User-Email` | **Dynamic** (optional fallback) | e.g. `campus360Email` from embed |

For **local testing only**, you may hardcode Alex’s id from `npm run verify:agent`.

---

## 3. Per-student identity (critical)

Copilot does **not** automatically know who is chatting. Every tool call must include the **logged-in student**.

The Campus360 app embeds the chat with query params:

- `campus360UserId`
- `campus360Email`

**Your job in Copilot Studio:**

1. Create global variables `Campus360UserId` and `Campus360Email`
2. Mark them **Global** + **External sources can set values** (see [Microsoft docs](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/pass-context-variables-from-webpage-to-copilot))
3. On conversation start, capture those values (or read from embed context)
4. Pass them into connector calls as `X-Campus360-User-Id` / `X-Campus360-User-Email`

If you skip this, every ticket/appointment will be created for **one fixed account**.

### 3b. Pass email to every API call (click-by-click)

Copilot variables and connector headers are separate. The variable holds the email; you still have to **send it on each tool call**.

**Part 1 — Re-import connector (or edit Swagger)**

Use the latest [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml). The `execute_agent_tool` action now has an optional header input: **`Campus360-User-Email`**.

**Part 2 — Connector policy (one-time)**

1. Power Platform → **Custom connectors** → **Campus360** → **Edit**
2. **Definition** → **Policies** → **New policy**
3. Fill in:

| Field | Value |
|-------|--------|
| Template | **Set HTTP header** |
| Run policy on | **Request** |
| Operations | **Execute an allow-listed agent tool** (and **Aggregated student context** if you use it) |
| Header name | `X-Campus360-User-Email` |
| Header value | `@headers('Campus360-User-Email')` |
| Action if header exists | **Override** |

4. **Update connector** (top right)

Keep your existing **Authorization** and **ngrok** policies. **Remove** any hardcoded `X-Campus360-User-Id` policy.

**Part 3 — Wire the variable in Copilot Studio**

1. Open your agent → **Tools**
2. Click **Execute an allow-listed agent tool** (Campus360 connector)
3. Open **Inputs** (or the tool’s configuration panel)
4. Find **`Campus360-User-Email`**
5. Set value to: **`Global.campus360Email`** (pick from variable list or Power Fx)

Do the same for **Aggregated student context** (`get_context`) if you call it directly.

**Part 4 — Test in connector editor**

1. Connector → **Test** tab → **Execute an allow-listed agent tool**
2. `toolName` = `list_holds`
3. Body = `{}`
4. `Campus360-User-Email` = `alex.johnson@university.edu`
5. Run → should return Alex’s 2 holds

Change email to another student → should return different data.

---

## 4. Which connector action to use?

### Important rule

Most connector cards call routes like `/tickets` or `/holds`. Those routes expect a **browser login cookie** and return `401` from Copilot.

| Connector card (OpenAPI path) | Works from Copilot? | What to use instead |
|------------------------------|---------------------|---------------------|
| `GET /agent/health` | ✅ Yes (no auth) | Use for connectivity test |
| `GET /agent/tools` | ✅ Yes | Lists tool names |
| `GET /agent/context` | ✅ Yes | Student snapshot |
| `POST /agent/tools/{toolName}` | ✅ Yes | **Use this for everything else** |
| `GET /holds`, `GET /tickets`, `POST /tickets`, etc. | ❌ No (cookie auth) | Call via **`execute_agent_tool`** |

### Recommended pattern

Enable **`Execute an allow-listed agent tool`** in your agent and route reads/writes through it with `toolName` in the path and a JSON body.

Read tools → body `{}`  
Write tools → body with required fields (see §6)

---

## 5. Add tools to your Copilot agent

1. Open your agent (e.g. **Campus360Orchestrator**)
2. **Tools** → **Add a tool** → **Connector** → **Campus360**
3. Add actions in this order:

| # | Connector action | Purpose | Enable for agent? |
|---|------------------|---------|-------------------|
| 1 | **Agent bridge health and mode** | Smoke test / debugging | Optional |
| 2 | **Aggregated student context** | Greeting + personalization | ✅ Yes |
| 3 | **Execute an allow-listed agent tool** | All reads & writes | ✅ **Required** |
| 4 | **Allow-listed tool names** | Discovery / debugging | Optional |

You **do not** need to add the individual ticket/hold/appointment cards if you use `execute_agent_tool` — they duplicate the same logic but hit the wrong auth layer.

If you prefer individual cards for readability in Studio, still call them only through **`execute_agent_tool`** in topics (ignore the direct `/tickets` actions).

---

## 6. Tool reference (`execute_agent_tool`)

**HTTP:** `POST /api/agent/tools/{toolName}`  
**Headers:** Authorization + `X-Campus360-User-Id` (or email)  
**Body:** JSON (see below)

### Read tools (safe to call anytime)

| toolName | Body / query | When the agent should call it |
|----------|--------------|-------------------------------|
| `get_context` | `{}` or `{ "threadId": "..." }` | Start of conversation; before complex help |
| `get_me` | `{}` | Confirm who is signed in |
| `list_holds` | `{}` | “Why is my account blocked?” / holds |
| `list_tickets` | `{}` | “What are my tickets?” |
| `get_ticket` | `{ "ticketNumber": "12293031" }` | Status on one ticket |
| `list_appointments` | `{ "status": "upcoming" }` | Upcoming visits (also `all`, `completed`) |
| `get_appointment_summary` | `{}` | “When is my next appointment?” |
| `get_availability` | `{ "department": "Campus Health", "year": 2026, "month": 5 }` | Before booking — **month is 0-based** (5 = June) |
| `list_departments` | `{}` | Pick department for booking |
| `list_notifications` | `{}` | Unread alerts |

### Write tools (confirm with student first)

| toolName | Body | Agent behavior |
|----------|------|----------------|
| `create_ticket` | `{ "concern": "...", "department": "IT Department", "description": "...", "urgency": "MEDIUM" }` | Confirm dept + concern before calling |
| `add_ticket_reply` | `{ "ticketNumber": "12293031", "content": "..." }` | Student follow-up on existing ticket |
| `cancel_ticket` | `{ "ticketNumber": "12293031" }` | Confirm before cancel |
| `request_appointment` | `{ "title": "...", "department": "Campus Health", "scheduledAt": "2026-06-12T14:00:00.000Z", "purpose": "..." }` | Only use `startsAt` values from `get_availability` |
| `reschedule_appointment` | `{ "appointmentId": "<id>", "scheduledAt": "..." }` | Check availability first |
| `cancel_appointment` | `{ "appointmentId": "<id>" }` | Confirm before cancel |
| `create_notification` | `{ "title": "...", "body": "...", "link": "/tickets/..." }` | In-app alert for the student |

### Departments (exact strings)

`IT Department` · `Registrar's Office` · `Campus Health` · `Cashier Office` · `Student Services` · `Library` · `Facilities`

Appointment booking departments: first five only.

### Demo “today” in the app

The prototype treats **June 9, 2026** as today. Availability starts from that date.

---

## 7. Map connector cards → `toolName`

If your **Search actions** screen shows these 14 cards:

| Connector card | Maps to toolName / route | Use from Copilot |
|----------------|--------------------------|------------------|
| Active student holds | `list_holds` | via `execute_agent_tool` |
| Agent bridge health and mode | `GET /agent/health` | Direct ✅ |
| Aggregated student context | `get_context` | Direct ✅ |
| Allow-listed tool names | `GET /agent/tools` | Direct ✅ |
| Book an appointment | `request_appointment` | via `execute_agent_tool` |
| Cancel an open ticket (student) | `cancel_ticket` | via `execute_agent_tool` |
| Create a support ticket | `create_ticket` | via `execute_agent_tool` |
| Current user profile | `get_me` | via `execute_agent_tool` |
| Department appointment slots | `get_availability` | via `execute_agent_tool` |
| **Execute an allow-listed agent tool** | `POST /agent/tools/{toolName}` | **Primary action** |
| List appointments | `list_appointments` | via `execute_agent_tool` |
| List tickets for current user | `list_tickets` | via `execute_agent_tool` |
| Student follow-up on a ticket | `add_ticket_reply` | via `execute_agent_tool` |
| Ticket detail | `get_ticket` | via `execute_agent_tool` |

---

## 8. Example topics to build

### Greeting (Conversation Start)

1. Call **Aggregated student context** (or `execute_agent_tool` → `get_context`)
2. Say: “Hi {name} — I see you have {openTicketCount} open tickets and {activeHoldCount} holds. How can I help?”

### Holds

- User: “Why can’t I enroll?”
- Tool: `list_holds` → explain each hold + department

### Create ticket

1. Gather: concern, department (suggest from `list_departments` if needed)
2. Confirm: “I’ll create a ticket for **{department}** about **{concern}**. OK?”
3. Tool: `create_ticket`
4. Reply with ticket number from response

### Book appointment

1. Ask department + purpose
2. Tool: `get_availability` with correct `year` / `month` (0-based)
3. Offer only times from `availability.slots`
4. Confirm slot → `request_appointment` with `scheduledAt` = chosen slot’s `startsAt`

---

## 9. Test each tool in the connector editor

Replace `USER_ID` with Alex’s id from `npm run verify:agent`.

### Health (no user header)

```http
GET https://YOUR-NGROK.ngrok-free.app/api/agent/health
```

Expected: `{ "status": "ok", "agentMode": "dev_bridge", ... }`

### List holds

```http
POST https://YOUR-NGROK.ngrok-free.app/api/agent/tools/list_holds
Authorization: Bearer campus360-dev-agent-key
X-Campus360-User-Id: USER_ID
Content-Type: application/json

{}
```

Expected: 2 holds (tuition + missing ID photo)

### Create ticket

```http
POST https://YOUR-NGROK.ngrok-free.app/api/agent/tools/create_ticket
Authorization: Bearer campus360-dev-agent-key
X-Campus360-User-Id: USER_ID
Content-Type: application/json

{
  "concern": "Library Wi-Fi outage",
  "department": "IT Department",
  "description": "Second floor"
}
```

### Get availability (June 2026, Campus Health)

```http
POST https://YOUR-NGROK.ngrok-free.app/api/agent/tools/get_availability
Authorization: Bearer campus360-dev-agent-key
X-Campus360-User-Id: USER_ID
Content-Type: application/json

{
  "department": "Campus Health",
  "year": 2026,
  "month": 5
}
```

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Authentication required` | You called `/tickets` or `/holds` directly — use `/agent/tools/...` |
| `Invalid agent API key` | Check `Authorization: Bearer campus360-dev-agent-key` policy |
| `Missing x-campus360-user-id header` | Add user id policy or dynamic variable |
| `User not found` | Typo in user id — run `npm run verify:agent` |
| HTML instead of JSON | Add `ngrok-skip-browser-warning: 1` policy |
| Ticket created for wrong student | Static user id in policy — make it dynamic (§3) |
| `That time is not available` | Pick `startsAt` exactly from `get_availability` slots |
| `Unknown department` | Use exact department strings from §6 |

---

## 11. Checklist before demo

- [ ] Backend on port **3001**
- [ ] ngrok running, connector base URL updated
- [ ] Policies: Authorization, ngrok header, dynamic user id/email
- [ ] Agent has **Execute an allow-listed agent tool** enabled
- [ ] Conversation Start calls `get_context`
- [ ] Test: “What holds do I have?” → 2 holds
- [ ] Test: “Create a ticket for Wi-Fi in the library” → new ticket on **Alex’s** account
- [ ] Identity: log in as a different student in the app → Copilot actions hit **that** student

---

## Related docs

- [`copilot-handoff.md`](./copilot-handoff.md) — quick start + ngrok
- [`copilot-integration.md`](./copilot-integration.md) — conversation patterns + error handling
- [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml) — OpenAPI import file
