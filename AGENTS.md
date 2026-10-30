# Agent guide: clear-mvp

clear-mvp is the CLEAR web app: the Next.js frontend analysts and field teams use. It is a
backend-for-frontend. Client components call tRPC procedures in `src/server/api/routers/`, and
each procedure calls clear-api's GraphQL with the user's session cookie. Components never call
GraphQL directly. The CLEAR Agent runs here too, server-side.

This file holds what an agent cannot work out from the code. Everything else is in the
[README](./README.md) (code map, stack, conventions, env vars) and
[CONTRIBUTING](./CONTRIBUTING.md) (setup, git flow, secrets). Read those before changing code.

## Commands

Bun is the package manager and runtime for scripts. CI pins Bun 1.3.1.

```bash
bun install --frozen-lockfile   # npm ci fails on a peer-dependency conflict; use bun
bun dev                         # dev server on :3000, needs clear-api running (see README)
bun run check                   # eslint + tsc --noEmit + i18n message check
bun run test                    # unit tests (Vitest); single file: bun run test -- <path>
bun run e2e                     # Playwright suite against a Docker stack; needs ../clear-api
```

On a pull request to `dev`, two workflows start in parallel. The unit workflow runs
`bunx vitest run`, `bunx tsc --noEmit`, `node scripts/check-messages.mjs`, then `bun run lint`.
The E2E workflow runs the Playwright smoke suite on its own and does not wait for the unit
workflow. Run `bun run check` and `bun run test` before pushing. Run `bun run e2e` when you touched a page flow, auth, or the
compose files.

## Gotchas

- `bun test` (no `run`) starts Bun's own test runner, not Vitest. Always `bun run test`.
- A local `next build` fails at "Collecting page data" unless `API_URL` is set. Use
  `API_URL=http://placeholder-set-at-runtime bun run build`, as the Dockerfile does. The build
  rewrites `public/sw.js`; revert that file afterwards.
- ESLint reports warnings on `dev` today. Don't fix unrelated warnings in a feature PR, and don't
  add new ones.
- `.env.local` on a developer machine often points `API_URL` at the remote dev API. The E2E
  script deliberately reads only the Mapbox token from it. Don't "fix" that.
- `NEXT_PUBLIC_*` variables are baked in at image build time and shipped to browsers. Adding one
  means a build arg in `.github/actions/build-image` and an `ARG`/`ENV` pair in the Dockerfile.
  Never put a secret in one.
- `.beads/` is a dead tracker from before Exponential. Don't read it for current work and don't
  file anything there.

## Git flow

- Branch off `dev` and open the pull request against `dev`. Conventional Commits
  (`feat:`, `fix:`, `docs:`, ...). A merge to `dev` builds and deploys the dev environment; a
  merge to `prod` deploys production.
- Greptile reviews every pull request. The PR merges itself once Greptile has reviewed the head
  commit with no open P0 or P1 and the checks pass. Fix P1s and push rather than arguing in
  comments. Add the `no-automerge` label only when merge order matters, and say why in the body.
- Never force-push to `dev` or `prod`.

## Tracker

Work is tracked in Exponential, workspace `clear`, product `clear`. Not GitHub Issues.

Agents must prefix every CLI call with their own home so writes are attributed to the agent, not
to the developer's personal account:

```bash
HOME=~/.config/agent-homes/claude exponential auth whoami
HOME=~/.config/agent-homes/claude exponential tickets get <cuid>
HOME=~/.config/agent-homes/claude exponential tickets update --id <cuid> --status IN_PROGRESS
```

Link tickets by number, never to the list page:
`https://www.exponential.im/w/clear/products/clear/tickets/<number>`. The `number` field comes
from `tickets get --json`; the `id` cuid is what the CLI takes as `--id`.

## Domain language

[`CONTEXT.md`](./CONTEXT.md) is the glossary and is long. Don't load it whole. Open the section
for the area you are changing:

| Area of the app | CONTEXT.md section |
|---|---|
| `/agent`, the agent drawer, `src/server/agent/` | Agent |
| Signals, events, alerts, crises and how they nest | Detection hierarchy |
| Inbox, review items, proposals, decisions | Review |
| Location challenges, changing a signal's location | Location trust |
| Invite acceptance, first-run welcome flow | Invited-user onboarding |
| Usage tracking and the account-wide opt-out | Usage analytics |
| Moving between detections on the detail pages | Detection detail navigation |
| Basemap, terrain, markers, marker panels | Map foundation, Map marker panels |
| Country scope and framing on the map | Country framing |
| Roads, access constraints, LogIE layers | Map operational layers |
| Foresight | Foresight |
| Situation analysis pages and windows | Situation Analysis |
| Colours and theme tokens | Theming language |

Decisions that constrain how things are built live in [`docs/adr/`](./docs/adr/). The ones that
bite most often: colours come from theme tokens, not hex literals (0002); there is one CLEAR
Agent and NRC Find is a tool it calls (0005); the agent runs in this app, not in clear-api
(0006); team admins decide location challenges (0007).

When you change the domain model, update the matching CONTEXT.md section in the same PR. When
you make a decision that a future reader would otherwise reverse, add an ADR.

## Conventions the reviewer will hold you to

- New user-facing strings go in `messages/en.json` and every other locale. `bun run i18n:check`
  fails CI otherwise.
- Severity thresholds come from `mapSeverity` in `src/lib/types/graphql.ts`. Severity labels
  and theme-aware colours for components come from `src/lib/constants/severity.ts`; the
  `severityColor` helper next to `mapSeverity` returns fixed hex and does not follow the theme.
  Disaster-type labels and colours come from `src/lib/disaster-types.ts`. Don't hand-roll
  thresholds.
- New server-side env vars are read through `src/server/env.ts` and documented in
  `.env.example` and the README table.
- Keep tRPC procedures thin. Business rules belong in clear-api; this app shapes data for the UI.

## Related repositories

clear-api (GraphQL backend, the schema of record), clear-pipeline (signal ingestion),
clear-infra (deploys). They are siblings of this repo on a developer machine. The E2E stack
expects clear-api at `../clear-api`.
