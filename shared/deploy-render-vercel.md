# Deploy Campus360 (Render + Vercel)

Two URLs when done:

| Service | Example URL |
|---------|-------------|
| **Backend (Render)** | `https://campus360-api.onrender.com` |
| **Frontend (Vercel)** | `https://campus360.vercel.app` |

Demo login (after seed): `alex.johnson@university.edu` / `campus360`

---

## Step 1 — Push code to GitHub

Make sure `render.yaml`, `backend/scripts/render-build.sh`, and `frontend/vercel.json` are on GitHub (main or your deploy branch).

---

## Step 2 — Deploy backend on Render

1. Go to [https://dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
2. **New Blueprint Instance** → connect GitHub repo **AIC26**
3. Render creates:
   - PostgreSQL database `campus360-db`
   - Web service `campus360-api`
4. When prompted for env vars, set:
   - **`CORS_ORIGIN`** — use your Vercel URL once you have it (Step 3). For now you can use `https://campus360.vercel.app` if that’s the name you’ll pick, or update after Step 4.
   - **`MICROSOFT_DIRECT_LINE_SECRET`** — same secret from Copilot Studio (optional; only for AI chat)
5. Wait for deploy to finish (first build runs migrations + seed).
6. Test: open `https://YOUR-SERVICE.onrender.com/api/health` → should show `{"status":"ok"}`

Copy your backend URL — you need it for Vercel and Copilot.

---

## Step 3 — Deploy frontend on Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new) → import GitHub repo **AIC26**
2. **Root Directory:** `frontend`
3. Framework: Vite (auto-detected)
4. **Environment variable:**

   | Name | Value |
   |------|--------|
   | `VITE_API_BASE` | `https://YOUR-SERVICE.onrender.com/api` |

5. Deploy.

Copy your Vercel URL (e.g. `https://aic26.vercel.app`).

---

## Step 4 — Link frontend ↔ backend

1. **Render** → `campus360-api` → **Environment**
2. Set **`CORS_ORIGIN`** = your exact Vercel URL (no trailing slash), e.g. `https://aic26.vercel.app`
3. Save → Render redeploys automatically.

Open the Vercel URL and log in with Alex.

---

## Step 5 — Update Copilot connector (only if AI tools should work)

Power Platform → **Custom connectors** → **Campus360** → **Edit**

| Field | New value |
|-------|-----------|
| **Host** | `YOUR-SERVICE.onrender.com` (no `https://`) |
| **Base URL** | `/api` (unchanged) |

Remove the **`ngrok-skip-browser-warning`** header policy if you had one.

Click **Update connector**, then test `GET /api/agent/health`.

Keep **`Authorization: Bearer …`** the same — use the `CAMPUS360_AGENT_API_KEY` value from Render env vars.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails on Vercel | Check `CORS_ORIGIN` matches Vercel URL exactly; check `VITE_API_BASE` ends with `/api` |
| 502 / slow first load | Render free tier sleeps after ~15 min idle — first request wakes it (~30s) |
| Empty data | Re-run seed from Render Shell: `npx tsx prisma/seed.ts` |
| Copilot tools 404 | Connector **Host** still points at ngrok — update to Render host |

---

## Render Shell (optional)

Render → `campus360-api` → **Shell**:

```bash
npx tsx prisma/seed.ts
```
