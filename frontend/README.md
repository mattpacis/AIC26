# Frontend

React + TypeScript + Vite app. Convert your HTML into components here.

## Scripts

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build
npm run preview  # preview production build
npm run lint     # ESLint
```

## Where to put converted HTML

| HTML | React location |
|------|----------------|
| Page markup | `src/pages/` |
| Reusable sections | `src/components/` |
| Global styles | `src/index.css`, `src/App.css`, or `src/styles/` |
| Images / fonts | `public/` or `src/assets/` |

Add new routes in `src/App.tsx`.

## API

- Client: `src/api/client.ts`
- Contract: `../shared/api.md`
- Dev proxy: `/api` → `http://localhost:3000` (see `vite.config.ts`)

Copy `.env.example` to `.env` if you need to override the API base URL.
