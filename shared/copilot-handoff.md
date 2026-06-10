# Copilot team handoff — Campus360 agent bridge

**Status:** App-side bridge is ready. Your team can connect Copilot Studio / Power Automate without changing business logic in the database.

---

## Start here (Day 1)

Do these in order — **two tracks in parallel**:

### Track A — App team (today, no Microsoft account needed)

1. Start backend: `cd backend && npm run dev`
2. Verify bridge: `cd backend && npm run verify:agent`
3. Log in as Alex in the UI → open AI Helpdesk → confirm replies mention real holds/tickets (`dev_bridge` mode)
4. Optional — test full Microsoft pipeline locally:

   ```env
   # backend/.env
   MICROSOFT_AGENT_ENDPOINT=http://localhost:3001/api/agent/mock-copilot
   ```

   Restart backend, chat again — replies should be prefixed `[Mock Copilot]`.

### Track B — Copilot team (can start same day)

1. Read [`copilot-integration.md`](./copilot-integration.md) §4–5 (topics + tools)
2. Import [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml) as a Custom Connector (or hand-build actions)
3. Connector base URL: `http://localhost:3001/api` (use **ngrok** if Studio is cloud-only — see [ngrok setup](#ngrok-for-copilot-studio) below)
4. Auth: Bearer `campus360-dev-agent-key` + header `X-Campus360-User-Id` (or `X-Campus360-User-Email`)
5. First tool to wire: **`list_holds`** (read-only, easy to test)
6. Second tool: **`get_context`**
7. Build topics for tickets / appointments / holds

### Track C — When Microsoft bot exists

1. Create Power Automate flow or Copilot Studio agent
2. HTTP trigger accepts `{ message, threadId, context, history }` → returns `{ reply }`
3. Set `MICROSOFT_AGENT_ENDPOINT` to that URL in `backend/.env`
4. Finetune conversation in Studio (tone, confirmations) — **no backend changes needed**

---

## What’s ready now

| Piece | URL / location |
|-------|----------------|
| Student chat (UI) | `POST /api/chat/messages` — uses `agentProvider` |
| Agent context | `GET /api/agent/context` |
| Agent tools | `POST /api/agent/tools/:toolName` |
| Tool catalog | `GET /api/agent/tools` |
| Health | `GET /api/agent/health` |
| OpenAPI sketch | [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml) |
| Full rules | [`copilot-integration.md`](./copilot-integration.md) |

**Modes**

- **`dev_bridge`** (default) — Chat answers using live student data (tickets, holds, appointments). No Microsoft endpoint required.
- **`microsoft`** — Set `MICROSOFT_AGENT_ENDPOINT` in `backend/.env`. Chat forwards each turn to your bot; falls back to dev bridge if the call fails.

---

## Auth for tool calls (Custom Connectors)

Every agent request needs **both** headers:

```http
Authorization: Bearer campus360-dev-agent-key
X-Campus360-User-Id: <student-user-id-from-session>
X-Campus360-User-Email: <student-email>   # optional fallback if user id is hard to pass
Content-Type: application/json
```

Get the student user id from `GET /api/me` after login, or from `GET /api/agent/context` during testing.

**Important — per-student identity in Copilot Studio:** The embedded chat iframe appends `campus360UserId` and `campus360Email` query params to the Copilot URL. Your topics/connector **must** read the signed-in student from the conversation (or those params) and send the matching `X-Campus360-User-Id` or `X-Campus360-User-Email` on every tool call. A **static** user id in connector policies will attribute all tickets/notifications to one account.

**Dev API key:** `campus360-dev-agent-key` (see `backend/.env`)

---

## Quick test (terminal)

```bash
# 1. Login as Alex and save cookie
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alex.johnson@university.edu","password":"campus360"}'

# 2. Get user id
curl -b cookies.txt http://localhost:3001/api/me

# 3. Agent health
curl http://localhost:3001/api/agent/health

# 4. Context (replace USER_ID)
curl -H "Authorization: Bearer campus360-dev-agent-key" \
  -H "X-Campus360-User-Id: USER_ID" \
  http://localhost:3001/api/agent/context

# 5. List holds tool
curl -X POST http://localhost:3001/api/agent/tools/list_holds \
  -H "Authorization: Bearer campus360-dev-agent-key" \
  -H "X-Campus360-User-Id: USER_ID" \
  -H "Content-Type: application/json" \
  -d '{}'

# 6. Chat in the app (dev bridge)
curl -b cookies.txt -X POST http://localhost:3001/api/chat/messages \
  -H 'Content-Type: application/json' \
  -d '{"message":"What holds do I have?"}'
```

---

## Tool names (v1, student only)

**Read:** `get_context`, `get_me`, `list_tickets`, `get_ticket`, `list_appointments`, `get_appointment_summary`, `get_availability`, `list_holds`, `list_departments`, `list_notifications`

**Write:** `create_ticket`, `add_ticket_reply`, `cancel_ticket`, `request_appointment`, `reschedule_appointment`, `cancel_appointment`, `create_notification`

Example create ticket:

```bash
curl -X POST http://localhost:3001/api/agent/tools/create_ticket \
  -H "Authorization: Bearer campus360-dev-agent-key" \
  -H "X-Campus360-User-Id: USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"concern":"Library Wi-Fi outage","department":"IT Department","description":"2nd floor"}'
```

---

## Connecting Microsoft Copilot (when your bot exists)

### Option A — Power Automate HTTP trigger (simplest for class project)

1. Create a flow with **When an HTTP request is received**.
2. Use the request body shape:

```json
{
  "message": "string",
  "threadId": "string",
  "context": { },
  "history": [{ "role": "user", "content": "..." }]
}
```

3. Return JSON: `{ "reply": "Your natural language answer" }`
4. Paste the trigger URL into `backend/.env`:

```env
MICROSOFT_AGENT_ENDPOINT=https://...powerplatform.com/...
```

5. Restart backend: `cd backend && npm run dev`

### Option B — Copilot Studio + Custom Connectors

1. Import [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml) as connectors (base URL `http://localhost:3001/api` for dev; use ngrok for remote Studio).
2. Set connector auth to Bearer `campus360-dev-agent-key` + header `X-Campus360-User-Id`.
3. Build topics that call tools per [`copilot-integration.md`](./copilot-integration.md) §4–5.
4. For **in-app chat**, either:
   - Point `MICROSOFT_AGENT_ENDPOINT` at a flow that wraps Copilot, **or**
   - Keep dev bridge for UI and use connectors only from Studio testing.

---

## ngrok for Copilot Studio

Copilot Studio in the cloud cannot call `localhost`. Use ngrok to expose your backend.

### 1. One-time setup (free)

1. Sign up: [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. Copy your authtoken: [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Add to `backend/.env`:

```env
NGROK_AUTHTOKEN=paste_your_token_here
```

### 2. Start the tunnel

Backend must be running (`npm run dev` on port 3001). In a **second terminal**:

```bash
cd backend
npm run ngrok
```

You’ll see output like:

```text
https://abc123.ngrok-free.app
Copilot base URL: https://abc123.ngrok-free.app/api
```

### 3. Use in Copilot Studio

| Setting | Value |
|---------|--------|
| **Connector base URL** | `https://abc123.ngrok-free.app/api` |
| **Authorization** | Bearer `campus360-dev-agent-key` |
| **Header** | `X-Campus360-User-Id: <student user id>` |

Get Alex’s user id: `npm run verify:agent` (printed at the end) or `GET /api/me` after login.

**Note:** Free ngrok URLs change each time you restart the tunnel — update the connector when that happens.

### 4. Power Platform connector — if headers “don’t work”

**Connection auth = `none` is correct.** Headers are **not** set on the “Connect to Campus360” screen — set them as **policies** on the connector.

1. Open the connector → **Definition** → **Policies** → **New policy** → **Set HTTP header**
2. Add **three** policies (Run on: **Request**, Action if exists: **override**):

| Header name | Value |
|-------------|--------|
| `Authorization` | `Bearer campus360-dev-agent-key` |
| `X-Campus360-User-Id` | Use a **dynamic** value from the signed-in student — not a fixed id in production |
| `X-Campus360-User-Email` | Optional fallback: student email from session / iframe query param `campus360Email` |
| `ngrok-skip-browser-warning` | `1` |

For local testing only you can hardcode Alex’s id (`npm run verify:agent`). In the real app, every student must get their own headers or tools will write to the wrong account.

3. Use the **agent tool** action, not browser session routes:

| Wrong (fails) | Right |
|---------------|--------|
| `GET /holds` | `POST /agent/tools/list_holds` |
| `GET /tickets` | `POST /agent/tools/list_tickets` |

Body for read tools: `{}`

4. **Test** the action in the connector editor — you should see Alex’s 2 holds (tuition + missing ID photo).

Common errors:

| Response | Cause |
|----------|--------|
| `Authentication required` | Called `/holds` or `/tickets` (student cookie routes) instead of `/agent/tools/...` |
| `Invalid agent API key` | `Authorization` header missing or wrong |
| `Missing x-campus360-user-id header` | User id header not sent |
| `User not found` | Typo in user id |
| HTML instead of JSON | ngrok interstitial — add `ngrok-skip-browser-warning` policy |

---

## What we need from you later

1. **Dev bot / flow URL** for `MICROSOFT_AGENT_ENDPOINT`
2. **Confirmation** connectors use the headers above (not student cookies)
3. **Sample conversations** that failed — we adjust APIs, not the database
4. **No direct DB access** — only documented tools

---

## Departments (exact strings)

`IT Department`, `Registrar's Office`, `Campus Health`, `Cashier Office`, `Student Services`, `Library`, `Facilities`

---

## Test account

| Email | Password | Role |
|-------|----------|------|
| `alex.johnson@university.edu` | `campus360` | student |

Alex has 4 tickets, 2 holds, and upcoming appointments in seed data.
