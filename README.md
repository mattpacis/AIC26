# AIC26

Monorepo for the AIC26 app: React frontend, backend API, and Microsoft AI agent integration.

## Structure

```
AIC26/
├── frontend/     # React + Vite + TypeScript (convert HTML here)
├── backend/      # API server (to be built with Codex)
└── shared/       # API contract shared by frontend and backend
```

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Server runs at http://localhost:3001. See `backend/README.md`.

Dev login: `alex.johnson@university.edu` / `campus360` (student) or `staff@university.edu` / `campus360` (staff). Google/Microsoft SSO: see [`shared/auth-sso.md`](shared/auth-sso.md).

The Vite dev server proxies `/api` requests to `http://localhost:3001`.

## Converting HTML to React

1. Place static assets in `frontend/public/` or `frontend/src/assets/`.
2. Create components in `frontend/src/components/`.
3. Create pages in `frontend/src/pages/` and register routes in `frontend/src/App.tsx`.
4. Move styles into `frontend/src/styles/` or co-located CSS modules.

## Microsoft AI agent

The frontend never holds agent secrets. It calls this app's backend; the backend connects to your Microsoft agent (Copilot Studio, Azure OpenAI, Bot Service, etc.).

| Document | Audience |
|----------|----------|
| [`shared/api.md`](shared/api.md) | HTTP API contract (frontend + agent tools) |
| [`shared/copilot-integration.md`](shared/copilot-integration.md) | **Copilot team** — rules, agent structure, tool catalog, how to connect |
| [`shared/copilot-handoff.md`](shared/copilot-handoff.md) | **Copilot team** — quick start, auth headers, test commands |
| [`shared/copilot-tools.openapi.yaml`](shared/copilot-tools.openapi.yaml) | OpenAPI sketch for Copilot Studio Custom Connectors |

**Split:** app team owns backend/services/UI; agent team owns Copilot Studio topics and tool *intents*. All data reads/writes go through the backend — never the database directly.
