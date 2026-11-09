# Contributing to clear-mvp

clear-mvp is the CLEAR web app: the frontend analysts and field teams use. The
[README](./README.md) explains what it does and how the code is organised. This page covers how
to get going and how changes get in.

## Two ways in

### Explore on your own (no account needed)

You can run the whole app on your machine, with seeded demo data and no credentials from the
team. The end-to-end test stack runs clear-api, Postgres and Redis in Docker next to this app.

You need [Bun](https://bun.sh) v1+, Docker, and
[clear-api](https://github.com/CLEAR-Initiative/clear-api) checked out next to this repo, at
`../clear-api`.

```bash
git clone https://github.com/CLEAR-Initiative/clear-api.git
git clone https://github.com/CLEAR-Initiative/clear-mvp.git
cd clear-mvp
bun install
bun run e2e:up      # builds and starts Postgres, Redis, clear-api and the app on :3000
bun run e2e:seed    # demo users, Sudan locations, events and an analysis
```

Open http://localhost:3000 and sign in as one of the seeded users in
[`e2e/support/data.ts`](./e2e/support/data.ts). They exist only in this local stack. Run
`bun run e2e:down` when you're done; the database is thrown away each time.

For the map, create a free [Mapbox](https://account.mapbox.com/) token and export it as
`NEXT_PUBLIC_MAPBOX_TOKEN` before `e2e:up`. Without it the map shows a token banner; everything
else works.

To work on the code with hot reload instead, run clear-api yourself (see its README), then
`cp .env.example .env` and `bun dev`.

Without credentials from the team, these stay off:

| Feature | Needs |
|---|---|
| CLEAR Agent (`/agent` and the drawer) | `ANTHROPIC_API_KEY`, `CLEAR_AGENT_API_KEY`, `NRC_FIND_API_TOKEN` |
| Feedback form | `NOTION_TOKEN` |
| INFORM Severity data | `ACAPS_API_TOKEN` |

The checks in [Making a change](#making-a-change) all run without credentials.

### Join the team

1. Register at https://api.clearinitiative.io/portal/login.
2. The team will get in touch with next steps: access to the tracker, and any dev credentials
   you need, shared privately.

Don't ask for credentials in issues or pull requests.

## Making a change

- Branch off **`dev`** and open pull requests against `dev`. A merge to `dev` builds the image
  for the dev environment; a merge to `prod` does the same for production.
- Before you push, run what CI runs:

  ```bash
  bunx vitest run                  # unit tests
  bunx tsc --noEmit                # typecheck
  node scripts/check-messages.mjs  # every locale has every message key
  bun run e2e                      # end-to-end (Playwright) suite, in the stack above
  ```

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, …).
- Every pull request gets an automated review from Greptile. A pull request merges itself once
  Greptile has reviewed its latest commit with no open P0 or P1 finding and the required checks
  pass. P2 findings don't block. Drafts, forks, bot authors and pull requests labelled
  `no-automerge` wait for a person.
- New user-facing strings go in [`messages/en.json`](./messages/en.json) and the other locales.
  The README's "Conventions worth knowing" covers the rest.
- The team tracks work in [Exponential](https://www.exponential.im/w/clear/products/clear), not
  GitHub Issues. You get access after registering. Small fixes are welcome as pull requests from
  anyone. For anything bigger, register first so we can talk it through.

## Environment variables

To add one:

1. Read it through [`src/server/env.ts`](./src/server/env.ts) if it's server-side.
2. Add it to [`.env.example`](./.env.example) with a comment: what it's for, what happens
   without it, and whether it's a secret. Add it to the README's Environment table.
3. Say in the pull request that it needs setting for dev and prod. The team sets deployed values
   in a private infrastructure repo.

`NEXT_PUBLIC_*` variables are baked in when the Docker image is built, so a new one also needs a
build arg in [`.github/actions/build-image`](./.github/actions/build-image/action.yml) and an
`ARG`/`ENV` pair in the [`Dockerfile`](./Dockerfile). They're shipped to every browser, so never
put a secret in one.

## Secrets

- Never commit `.env` or any secret.
- Never paste secret values into issues, pull requests, chat or AI tools.
- If one leaks, tell the team straight away so it can be rotated.
- Credentials only ever come from the team, privately.

## Reporting a security issue

Don't open a public issue. Report it privately through GitHub:
[Report a vulnerability](https://github.com/CLEAR-Initiative/clear-mvp/security/advisories/new)
(the repo's Security tab).

## Licence

clear-mvp is licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE).
By contributing, you agree your contribution is licensed the same way.
