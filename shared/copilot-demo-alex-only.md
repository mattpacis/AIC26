# Copilot demo mode — Alex hardwired (simple)

**Use this for class demo.** Every Copilot action hits **Alex Johnson**’s account. No URL variables, no email headers on the tool.

Backend still works with hardcoded user id — verified ✅

---

## Connector policies (only 3)

**Campus360 v03** → Definition → Policies → Set HTTP header · Request · Override

| Policy name | Header | Value |
|-------------|--------|--------|
| Campus360 Authorization | `Authorization` | `Bearer campus360-dev-agent-key` |
| ngrok skip warning | `ngrok-skip-browser-warning` | `1` |
| Campus360 Alex user | `X-Campus360-User-Id` | `cmq4jyyp20001dymxqlkyntbl` |

**Delete** these if you added them:
- `X-Campus360-User-Email` policy
- `X-Campus360-Embed-Token` policy
- `@headers('Campus360-User-Email')` policy

**Update connector.**

---

## Copilot agent tool

Use **Execute an allow-listed agent tool** (your existing v03 card is fine).

| Input | Value |
|--------|--------|
| `toolName` | Dynamically fill with AI |
| `Campus360-User-Email` | **Remove / leave empty** |
| `Campus360-Embed-Token` | **Remove** |

Do **not** add separate `create_ticket` or `list_holds` cards.

**Publish** the agent.

---

## ngrok + backend

```bash
cd backend && npm run dev
cd backend && npm run ngrok   # update connector host if URL changed
```

Test: `GET https://YOUR-NGROK.ngrok-free.app/api/agent/health`

---

## Connector test

**Execute an allow-listed agent tool** (or invoke if you imported v04):

- `toolName`: `list_holds`
- Body: `{}`
- **No email header needed** (policy sends Alex’s id)

Then `create_ticket` with body:
```json
{"concern":"No wifi","department":"IT Department"}
```

---

## Log in for UI

| Email | Password |
|-------|----------|
| `alex.johnson@university.edu` | `campus360` |

Copilot and dashboard will both show Alex’s data.

---

## Ignore for demo

- Set context variables topic
- `Global.campus360Email` / `campus360Token`
- External sources from URL
- v04 re-import (optional — not required if v03 + execute_agent_tool works)
