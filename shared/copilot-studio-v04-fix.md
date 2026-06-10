# Campus360 Copilot — v04 connector fix (do this now)

Fixes `ConnectorRequestFailure` 404/500 errors. **Re-import the connector** and use **one** tool.

---

## 1. Start backend + ngrok

```bash
cd backend
npm run dev
```

Second terminal:

```bash
cd backend
npm run ngrok
```

Copy: `https://XXXX.ngrok-free.app/api`

Test in browser: `https://XXXX.ngrok-free.app/api/agent/health` → `{"status":"ok"}`

---

## 2. Re-import connector as Campus360 v04

1. Power Platform → **Custom connectors** → **New** → **Import OpenAPI**
2. Upload [`copilot-tools.openapi.yaml`](./copilot-tools.openapi.yaml) (v0.2.0)
3. **Host:** `XXXX.ngrok-free.app` (no `https://`)
4. **Base URL:** `/api`
5. **Authentication:** No authentication

---

## 3. Policies (only 3 — no embed token)

**Definition → Policies → Set HTTP header** · Run on Request · Override

| Name | Header | Value |
|------|--------|--------|
| Campus360 Authorization | `Authorization` | `Bearer campus360-dev-agent-key` |
| ngrok skip warning | `ngrok-skip-browser-warning` | `1` |
| Campus360 user email | `X-Campus360-User-Email` | `@headers('Campus360-User-Email')` |

**Delete** any `X-Campus360-Embed-Token` or hardcoded `X-Campus360-User-Id` policies.

**Update connector.**

---

## 4. Test connector (before Copilot)

**Test** → **invoke_agent_tool**:

| Field | Value |
|--------|--------|
| `Campus360-User-Email` | `alex.johnson@university.edu` |
| Body | `{"toolName":"list_holds"}` |

→ 2 holds. Then:

```json
{
  "toolName": "create_ticket",
  "concern": "No wifi",
  "department": "IT Department"
}
```

→ 200 + ticket number.

---

## 5. Copilot agent — ONE tool only

**Tools** → remove all old Campus360 tools → add:

| Tool | Action |
|------|--------|
| **invoke_agent_tool** | ✅ Required |
| agent_health | optional smoke test |

**Do NOT add:** create_ticket, list_holds, list_tickets as separate cards.

### Configure invoke_agent_tool

| Input | Value |
|--------|--------|
| **Campus360-User-Email** | Custom value → `alex.johnson@university.edu` (demo) or `Global.campus360Email` |
| **Body** | **Dynamically fill with AI** |

### Agent instructions (paste)

```
Always use invoke_agent_tool. Put toolName and all fields in the JSON body.

toolName values (underscores, lowercase):
list_holds, list_tickets, get_context, get_me, create_ticket,
get_availability, request_appointment, list_notifications

create_ticket body must include:
- toolName: "create_ticket"
- concern: short summary
- department: exact name e.g. "IT Department" (wifi → IT Department)

Never ask for student email or ID — identity is sent automatically.
```

**Publish** the agent.

---

## 6. Identity variable (optional)

Set context topic → `campus360Email` default:

```
Text("alex.johnson@university.edu")
```

Or your real login email. Map to `Campus360-User-Email` on the tool.

---

## Tool body examples

**List holds:**
```json
{"toolName":"list_holds"}
```

**Create ticket (wifi):**
```json
{
  "toolName": "create_ticket",
  "concern": "No wifi in dorm",
  "department": "IT Department"
}
```

**Context:**
```json
{"toolName":"get_context"}
```
