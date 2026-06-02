# CLEAR MVP (clear-mvp)

Next.js 15 frontend for the CLEAR humanitarian crisis monitoring platform. Detects, clusters, and surfaces crisis signals from Dataminr, GDACS, ACLED, and manual sources for NGOs operating in Sudan and neighbouring countries.

## Tech Stack

- **Next.js 15** (App Router, Turbopack dev server)
- **React 19**
- **[Mantine v8](https://mantine.dev/)** — UI components (custom Liquid Glass theming)
- **TailwindCSS 4** — utility styling
- **[tRPC 11](https://trpc.io/)** — type-safe BFF in front of the GraphQL API
- **[TanStack Query 5](https://tanstack.com/query)** — data caching
- **[Better Auth](https://better-auth.com/)** — auth client (cookie sessions proxied to clear-api)
- **[Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/)** — crisis map visualisation
- **[Recharts](https://recharts.org/)** — dashboard charts
- **PWA** via [@ducanh2912/next-pwa](https://github.com/DuCanhGH/next-pwa) (installable, offline-friendly)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1+ (or npm — Bun recommended to match `bun.lockb`)
- A running clear-api (locally at `http://localhost:4000` or a dev deployment)
- A Mapbox token ([free tier is fine](https://account.mapbox.com/))

### Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your values (see "Environment" below)

# Run the dev server (Turbopack, port 3000)
bun dev
```

Open `http://localhost:3000`.

## Environment

Copy [`.env.example`](./.env.example) to `.env` and fill in:

| Variable                   | Required    | Purpose                                                                                                                                                                 |
| -------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_URL`                  | yes in prod | clear-api base URL (e.g. `http://localhost:4000`). Used server-side by tRPC + auth proxy. Falls back to `http://localhost:4000` in dev.                                 |
| `GRAPHQL_URL`              | no          | Explicit GraphQL endpoint. Defaults to `${API_URL}/graphql`.                                                                                                            |
| `GRAPHQL_API_KEY`          | no          | Service-account key for server-to-server GraphQL calls that don't carry a user session.                                                                                 |
| `NEXT_PUBLIC_AUTH_URL`     | yes in prod | Public clear-api URL the browser uses for Better Auth (e.g. `https://dev-api.clearinitiative.io`). Must be reachable from the user's browser — not an internal address. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | yes         | Mapbox public token for the crisis map.                                                                                                                                 |
| `ACAPS_API_TOKEN`          | optional    | INFORM risk index integration on the dashboard.                                                                                                                         |
| `CORS_ORIGIN`              | dev only    | Passed through to clear-api's CORS config in local dev.                                                                                                                 |

`NEXT_PUBLIC_*` variables are inlined at build time and shipped to the browser. Everything else is server-side only.

## Scripts

```bash
bun dev            # Turbopack dev server on :3000
bun run build      # Production build
bun start          # Start production server (after build)
bun run lint       # next lint (ESLint)
bun run typecheck  # tsc --noEmit
bun run check      # lint + typecheck
```

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (app)/                # Authenticated app shell (sidebar + layout)
│   │   ├── dashboard/        # Home / KPI overview
│   │   ├── detection/        # Live alerts, events, signals, history tabs
│   │   ├── event/            # Individual event detail
│   │   ├── signal/           # Individual signal detail
│   │   ├── crisis/           # Situations (analyst-curated)
│   │   ├── map/              # Crisis map (Mapbox + layer controls)
│   │   ├── analysis/         # Analytical views
│   │   ├── profile/          # User profile + alert subscriptions
│   │   ├── notification-preferences/
│   │   ├── admin/            # Admin-only: users, teams, data sources
│   │   └── settings/
│   ├── auth/                 # Sign in / sign up / forgot password
│   ├── accept-invite/        # Invite onboarding flow
│   ├── observe/              # Manual signal creation (field officers)
│   └── api/                  # Next.js route handlers (auth proxy, media proxy)
├── server/
│   ├── env.ts                # Central server-side env access
│   └── api/                  # tRPC BFF — one router per domain
│       ├── trpc.ts           # initTRPC, protectedProcedure, orgAdminProcedure
│       ├── graphql.ts        # GraphQL fetch wrapper (forwards cookies)
│       └── routers/
│           ├── signals.ts    events.ts    alerts.ts    subscriptions.ts
│           ├── situations.ts locations.ts detections.ts feedback.ts
│           ├── comments.ts   invitations.ts  teams.ts   auth.ts
│           └── ...
├── components/               # Cross-page components (situation-detail, signal-detail, event-detail, nav, etc.)
├── hooks/                    # Custom hooks
├── lib/                      # Non-React utilities (type helpers, disaster-type lookup, severity helpers, auth-client)
├── trpc/                     # tRPC React client setup
├── providers/                # MantineProvider, SessionProvider, TRPCReactProvider
├── styles/                   # globals.css + glass-components.css (Liquid Glass theme)
└── middleware.ts             # Route-level auth gating
```

## Key Conventions

### Data flow

1. Components use the tRPC React client: `api.signals.list.useQuery(...)`.
2. Each tRPC procedure is a thin wrapper that calls `graphqlFetch(...)` from [`src/server/api/graphql.ts`](src/server/api/graphql.ts), which forwards the user's auth cookie to clear-api.
3. Mutations flow through the same layer; optimistic updates use TanStack Query's invalidation helpers (`utils.signals.list.invalidate()`).

Never hit the GraphQL endpoint directly from client components — go through tRPC so types + auth stay consistent.

### Auth

- Login via `/auth/signin` → Better Auth (clear-api at `/api/auth/*`) sets a session cookie.
- [`src/middleware.ts`](src/middleware.ts) redirects unauthenticated requests to `/auth/signin`, with exceptions for `/api/*`, static assets, and the `accept-invite` flow.
- `protectedProcedure` in [`src/server/api/trpc.ts`](src/server/api/trpc.ts) validates the session against clear-api's `/api/auth/get-session` and attaches the user object to `ctx`.
- `orgAdminProcedure` additionally gates on `role in ("admin", "org_admin")`.

### Severity

Events and signals use a **1–5 scale** (1=minimal, 5=critical). Use helpers from [`src/lib/types/graphql.ts`](src/lib/types/graphql.ts):

```ts
import { mapSeverity, severityColor } from "~/lib/types/graphql";

const bucket = mapSeverity(event.severity); // "critical" | "high" | "medium" | "low"
const hex = severityColor(event.severity); // hex colour
```

### Disaster types

Events store an array of glide codes (e.g. `["fl", "ba"]`). All codes in a single event belong to the same `level_1` category. Three-level hierarchy is served by the `subscriptions.disasterTypeHierarchy` tRPC query. Use [`src/lib/disaster-types.ts`](src/lib/disaster-types.ts) for UI label/colour/classKey resolution.

## Deployment (Vercel)

- `vercel.json` pins the Node version + framework.
- Build command: `bun run build` (or `npm run vercel-build` which wraps prepare + build).
- Set the env vars above in Vercel's dashboard for each environment (Preview / Production).
- PWA caching: service worker is disabled in `development` (see `next.config.js`) and generated at build time for production.

## Troubleshooting

- **"Auth service unavailable"** when opening any authed page → clear-api isn't reachable from the server. Check `API_URL` and that `bun dev` in clear-api is running.
- **Map renders blank or errors about token** → `NEXT_PUBLIC_MAPBOX_TOKEN` missing / invalid.
- **"Missing required environment variable"** at boot → a var is required in production but absent. See `src/server/env.ts`.
- **Session cookie not set** after login → `NEXT_PUBLIC_AUTH_URL` must match the clear-api domain the browser actually hits (cross-domain cookies need correct `SameSite` on clear-api).
- **`type` GraphQL parse error in dev** → you wrote a `` ` `` backtick inside a `gql\`\`` template string; remove it (the template literal ends there).

## Contributing

- All generated code must pass `bun run check`.
- Follow the no-emojis, no-commenting-the-obvious rule (see [`CLAUDE.md`](./CLAUDE.md)).
- Commit messages: conventional-commit style, professional; no "Claude Code" or AI references.

## License

Copyright (C) 2026 Norwegian Refugee Council.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version. See [`LICENSE`](./LICENSE) for the full text.
