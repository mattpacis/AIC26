# Backend

Campus360 API server — source of truth for auth, data, chat, and (later) Copilot actions.

## Stack

- **Node.js + Express + TypeScript**
- **Prisma + SQLite** (local dev; swap to Postgres in production)
- **Cookie sessions** for auth

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Server runs at http://localhost:3001 (port 3001 avoids conflicts if you also run Next.js on 3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo school + users |
| `npm run db:reset` | Reset DB and re-seed |

## Architecture

```
routes/     → HTTP handlers (validate input, check auth)
services/   → Business rules (shared by UI + future Copilot actions)
prisma/     → Database schema and migrations
```

Copilot never writes to the database directly. Future action endpoints will call the same service functions as the UI.

**Agent teammates:** see `../shared/copilot-handoff.md`, `../shared/copilot-integration.md`, and `../shared/copilot-tools.openapi.yaml`.

## API

See `../shared/api.md` for the full contract.

Phase 1–2 endpoints implemented:

- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`
- Dashboard: `GET /api/dashboard` (includes real open ticket count)
- Tickets: `GET /api/tickets`, `GET /api/tickets/:ticketNumber`, `POST /api/tickets`, `PATCH /api/tickets/:ticketNumber/status`
- Appointments: `GET /api/appointments`, `POST /api/appointments`, `PATCH /api/appointments/:id/reschedule`, `PATCH /api/appointments/:id/cancel`
- Chat: threads, messages, placeholder assistant replies
- Health: `GET /api/health`

Permissions: students see only their own tickets; staff see all tickets in their school. All ticket writes go through `ticketService` (same path future Copilot actions will use).

## Dev login

| Email | Password | Role |
|-------|----------|------|
| `alex.johnson@university.edu` | `campus360` | student |
| `staff@university.edu` | `campus360` | staff |
