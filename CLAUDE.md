# CLEAR MVP — Claude Code Rules

## Tech Stack
- **Framework**: Next.js 15 App Router, React 19, tRPC 11
- **UI**: Mantine 8, Tabler Icons, Tailwind CSS 4
- **Backend**: Django API (proxied via tRPC routers)
- **Package manager**: bun (NEVER use npm)
- **Path alias**: `~/` → `./src/`

## Database Safety

### ABSOLUTELY NEVER USE `db:push`
- `npx prisma db push` ❌
- `npm run db:push` ❌
- `bun run db:push` ❌
- Any variation of database push commands ❌

### ONLY ALLOWED DATABASE COMMANDS
- `npx prisma migrate dev --name <descriptive_name>` ✅ (user runs manually)
- `npx prisma generate` ✅ (to regenerate client after schema changes)

### NEVER RUN MIGRATIONS AUTOMATICALLY
Always ask the user to run migrations manually. Migrations are essential for:
- Version control of schema changes
- Team collaboration
- Production deployments
- Rollback capabilities

## Code Conventions
- Use Mantine components (not shadcn/ui) — the project uses `@mantine/core`
- Use `@tabler/icons-react` for icons
- tRPC routers proxy to Django via `djangoFetch` from `~/server/api/django`
- Feature flags stored in Django backend via `/feature_flags/api/flags/` (falls back to local defaults if unreachable)
- Route groups: `(app)` for authenticated pages, `(auth)` for login

## Destructive Operations
- NEVER run `git reset --hard` without user confirmation
- NEVER run `git push --force` without user confirmation
- NEVER delete files or directories without user confirmation
- NEVER modify `.env` files without user confirmation
