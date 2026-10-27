# CLEAR web app (clear-mvp)

**CLEAR** (Crisis Learning, Early-warning, Anticipation, and Response) is a humanitarian
decision-support platform built with the [Norwegian Refugee Council](https://www.nrc.no/) (NRC).
It watches news, social media and partner feeds for signs of crises — conflict, floods,
displacement, disease outbreaks — and turns them into alerts and analysis that response teams
can act on.

**This repository is the web application.** It is the main operational tool used by NRC teams
on the ground in **Sudan, Afghanistan and Venezuela**: the place where they see what is
happening, decide what matters, and prepare situation analyses. It holds no data of its own —
everything it shows comes from [clear-api](https://github.com/CLEAR-Initiative/clear-api).

## Where this fits

CLEAR is three repositories working together:

```
  Dataminr, ReliefWeb,           ┌──────────────────┐   GraphQL    ┌─────────────┐   GraphQL    ┌──────────────────┐
  ACLED, GDACS, field  ───────▶  │  clear-pipeline  │  ─────────▶  │  clear-api  │  ◀─────────  │    clear-mvp     │  ◀── NRC field teams
  reports, ...                   │  ingest + LLM    │   (writes)   │  database   │   (reads,    │   this repo      │      and analysts
                                 └──────────────────┘              └─────────────┘    actions)  └──────────────────┘
```

| Repo | What it does |
|---|---|
| [clear-pipeline](https://github.com/CLEAR-Initiative/clear-pipeline) | Pulls in raw reports (Dataminr and other feeds, ReliefWeb documents), classifies and clusters them with LLMs, and writes the results into clear-api. |
| [clear-api](https://github.com/CLEAR-Initiative/clear-api) | The system of record: a GraphQL API over PostgreSQL/PostGIS. Owns the data model, users, permissions and auth. |
| **[clear-mvp](https://github.com/CLEAR-Initiative/clear-mvp)** | **This repo.** The web app people actually use. Reads from and acts on clear-api; never touches a database directly. |

To run this app locally you need a clear-api instance to point at (local or a dev deployment).
You do not need the pipeline running — it only fills the API with data.

## Key ideas in two minutes

Data flows up a ladder, from raw observation to curated situation:

| Term | Meaning |
|---|---|
| **Signal** | One raw observation from a source — a Dataminr alert, an ACLED incident, a report from a field officer. |
| **Event** | One real-world incident, made from one or more Signals clustered together and classified by hazard type. |
| **Alert** | An Event raised for attention (`draft` → `published` → `archived`) — what analysts act on first. |
| **Crisis** | An analyst-curated grouping of Events, with an LLM-drafted summary, scenarios and NRC needs analysis. |
| **Location** | The admin hierarchy everything is pinned to: country → state → district → landmark. |

Severity runs **1–5** (1 = minimal, 5 = critical). The full glossary — including the CLEAR
Agent, Inbox, review flows and location trust — is in [`CONTEXT.md`](./CONTEXT.md). Design
decisions are recorded in [`docs/adr/`](./docs/adr/).

## What users can do

| Area | Route | Purpose |
|---|---|---|
| Overview | `/dashboard` | Headline numbers and recent activity for the user's countries. |
| Detection | `/detection` | Live feed of Alerts, Events and Signals, with filters and history. |
| Map | `/map` | Everything on a Mapbox map, with layers (e.g. access constraints, seismic activity). |
| Inbox | `/inbox` | Items waiting on a person's decision — hotline threads, proposed signals. |
| Analysis | `/analysis`, `/crisis/[id]` | Build and read situation analyses; open a crisis to see its Events, summary and scenarios; export to PDF. |
| Agent | `/agent` (and a drawer on every page) | Chat with the CLEAR Agent, which answers from CLEAR's data and NRC's knowledge base. |
| Observe | `/observe` | Field officers report something they have seen as a new Signal. |
| Admin | `/admin`, `/metrics` | Users, teams, invitations, data sources, platform metrics. |

The UI is available in English, French, Spanish and Arabic ([`messages/`](./messages/)), and is
an installable PWA with an offline fallback page.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) v1+ (the lockfile is `bun.lockb`)
- A reachable **clear-api** — run it locally (`bun dev` in clear-api, default `http://localhost:4000`)
  or use a dev deployment
- A [Mapbox](https://account.mapbox.com/) public token (free tier is fine)
- An account on that clear-api instance (accounts are invite-only)

### Run it

```bash
bun install
cp .env.example .env    # then fill in the values below
bun dev                 # http://localhost:3000
```

### Environment

The minimum to get a working app is `API_URL` and `NEXT_PUBLIC_MAPBOX_TOKEN`. The rest switch
on specific features. [`.env.example`](./.env.example) documents each one.

| Variable | Needed for | Notes |
|---|---|---|
| `API_URL` | Everything | clear-api base URL, used server-side. Defaults to `http://localhost:4000` in development; required in production. |
| `GRAPHQL_URL` | — | Override the GraphQL endpoint. Defaults to `${API_URL}/graphql`. |
| `GRAPHQL_API_KEY` | Server-to-server calls | Service-account key for GraphQL calls that carry no user session. |
| `NEXT_PUBLIC_AUTH_URL` | Sign-in in production | Public clear-api URL the **browser** uses for auth. Must be reachable from the user's machine. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps | Mapbox public token. |
| `CLEAR_AGENT_MODEL`, `ANTHROPIC_API_KEY`, `CLEAR_AGENT_API_KEY` | CLEAR Agent | Model string (e.g. `anthropic/...`), its provider key, and the Agent's clear-api key. |
| `NRC_FIND_API_URL`, `NRC_FIND_API_TOKEN` | CLEAR Agent | NRC Find, NRC's internal knowledge base. |
| `NEXT_PUBLIC_LOGIE_BLOCKAGES_URL` | Map access-constraints layer | See [`docs/clear-api-logie-ingest.md`](./docs/clear-api-logie-ingest.md). |

`NEXT_PUBLIC_*` variables are baked in at build time and shipped to the browser. Everything else
stays on the server.

## How the code is organised

```
Browser ──▶ React components ──▶ tRPC (src/server/api) ──▶ clear-api GraphQL
                                  forwards the user's
                                  session cookie
```

The app is a **backend-for-frontend**: client components call typed tRPC procedures, and each
procedure is a thin wrapper that calls clear-api with the user's session. Components never call
GraphQL directly — going through tRPC keeps types and auth consistent. The CLEAR Agent also runs
here, server-side ([ADR 0006](./docs/adr/0006-clear-agent-runs-in-the-bff.md)).

```
src/
├── app/                  Next.js App Router
│   ├── (app)/            Signed-in app: dashboard, detection, map, inbox, crisis, analysis, agent, admin, ...
│   ├── auth/             Sign in, sign up, password reset
│   ├── accept-invite/    Invitation onboarding
│   ├── welcome/          First-run profile and settings
│   ├── observe/          Field reporting
│   └── api/              Route handlers: auth proxy, tRPC, Agent stream, media/data proxies
├── server/
│   ├── api/routers/      tRPC routers, one per domain (signals, events, alerts, crises, analysis, ...)
│   ├── api/graphql.ts    GraphQL fetch wrapper (forwards the session cookie)
│   ├── agent/            CLEAR Agent (Mastra) and its tools
│   └── env.ts            Server-side env access
├── components/           Shared UI
├── lib/                  Non-React helpers (types, severity, disaster types, auth client)
├── i18n/                 Locale setup (strings live in /messages)
├── trpc/  providers/  hooks/  styles/
└── middleware.ts         Redirects signed-out users to /auth/signin
```

**Stack:** Next.js 15 (App Router) · React 19 · tRPC 11 + TanStack Query 5 · Mantine 8 +
Tailwind 4 · Better Auth (sessions live in clear-api) · Mapbox GL · Mastra (CLEAR Agent) ·
next-intl · Sentry.

### Conventions worth knowing

- **Auth.** Sign-in goes to clear-api's Better Auth endpoints, which set a session cookie.
  `protectedProcedure` in [`src/server/api/trpc.ts`](./src/server/api/trpc.ts) validates it;
  `orgAdminProcedure` additionally requires an admin role. clear-api enforces permissions too.
- **Severity.** Use `mapSeverity` / `severityColor` from
  [`src/lib/types/graphql.ts`](./src/lib/types/graphql.ts) rather than hand-rolled thresholds.
- **Disaster types.** Events carry GLIDE codes (e.g. `["fl"]`); resolve labels and colours with
  [`src/lib/disaster-types.ts`](./src/lib/disaster-types.ts).
- **Colours** come from theme tokens, not hex literals ([ADR 0002](./docs/adr/0002-colors-come-from-theme-tokens.md)).
- **Strings** go in `messages/en.json` and the other locales; `bun run i18n:check` verifies every
  locale has every key.

## Scripts

```bash
bun dev               # dev server on :3000 (Turbopack)
bun run build         # production build
bun start             # serve the production build
bun run typecheck     # tsc --noEmit
bun run lint          # next lint
bun run i18n:check    # every locale has every message key
bun run check         # lint + typecheck + i18n:check
bun run test          # unit tests (Vitest)
bun run e2e           # end-to-end tests (Playwright; needs Docker and clear-api checked out at ../clear-api)
```

## Contributing and deployment

- Branch off **`dev`** and open pull requests against `dev`.
- CI runs unit and end-to-end checks on every PR.
- A merge to **`dev`** tags a new version and builds the Docker image for the dev environment;
  a merge to **`prod`** does the same for production
  ([`.github/workflows/`](./.github/workflows/)). The image uses Next.js standalone output
  ([`Dockerfile`](./Dockerfile)).
- Work is tracked in [Exponential](https://www.exponential.im/w/clear/products/clear), not GitHub Issues.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

## Troubleshooting

- **"Auth service unavailable"** on any signed-in page — the server can't reach clear-api. Check
  `API_URL` and that clear-api is running.
- **Signed in, but the session doesn't stick** — `NEXT_PUBLIC_AUTH_URL` must be the clear-api
  address the browser actually uses; cross-domain cookies also need clear-api's `SameSite` set
  correctly.
- **"Waiting for Access" after sign-in** — your account isn't in an organisation yet. Ask an
  admin for an invitation.
- **Blank map** — `NEXT_PUBLIC_MAPBOX_TOKEN` is missing or invalid.
- **"Missing required environment variable"** at boot — see
  [`src/server/env.ts`](./src/server/env.ts).
- **Offline page not showing in dev** — the service worker is only built in production. Test
  with `bun run build && bun start`.

## License

Copyright (C) 2026 Norwegian Refugee Council.

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU Affero General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version. See [`LICENSE`](./LICENSE) for the full
text.
