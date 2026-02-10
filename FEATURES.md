# CLEAR MVP — Feature Documentation

**CLEAR** = Crisis Learning, Early-warning, Anticipation, and Response
Humanitarian decision-support platform built for NRC (Norwegian Refugee Council).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 App Router, React 19 |
| API | tRPC 11 (type-safe, React Query integrated) |
| Database | PostgreSQL (Railway) via Prisma 6 |
| Auth | Better Auth (email/password + optional GitHub OAuth) |
| UI | shadcn/ui (new-york style), Tailwind CSS 4, Lucide icons |
| Validation | Zod |
| Maps | Mapbox GL JS (dynamic import, client-only) |

**Path alias:** `~/` maps to `./src/`
**Prisma output:** `../generated/prisma`

---

## Architecture

### Route Groups

- `(app)` — Authenticated pages. Layout at `src/app/(app)/layout.tsx` checks session via Better Auth and redirects to `/login` if unauthenticated. Wraps all pages in `SidebarProvider` with the `AppSidebar` component.
- `(auth)` — Public auth pages (`/login`). Redirects to `/dashboard` if already authenticated.

### Data Flow

Server components fetch data via tRPC server callers (`api.router.procedure()`). Client components use tRPC React hooks (`api.router.procedure.useQuery()` / `.useMutation()`). Prisma types flow end-to-end through tRPC to the UI with full type safety.

### Navigation

Sidebar (`src/components/app-sidebar.tsx`) with links to:
Dashboard, Crises, Data Feeds, Map, Surveys, Audit Trail, Settings

---

## Phase 1: Foundation & Schema

### Prisma Schema (`prisma/schema.prisma`)

**Better Auth models** (managed by Better Auth):
- `User` — Extended with `role` (UserRole enum), `organization`, `country`
- `Session`, `Account`, `Verification`

**Core domain models:**
- `Crisis` — title, type (CrisisType), severity (CrisisSeverity), location, lat/lng, description, affectedPopulation, status (CrisisStatus). Linked to User (creator), Decision[], Alert[], Survey[].
- `Decision` — linked to Crisis + User. Has confidenceScore (0-100), optionA/B/C, selectedOption, rationale, outcome.
- `Alert` — linked to Crisis. Has type (AlertType), severity (AlertSeverity), message, isActive, triggeredAt/resolvedAt.
- `AuditDecision` — full audit trail with type, rationale, riskLevel, informationSources (JSON), stakeholders (JSON), location, deviceId, status, syncStatus, priority, cryptoHash.
- `Evidence` — file attachment linked to AuditDecision. Has type (EvidenceType), filename, size, hash.

**15 enums:** UserRole, CrisisType, CrisisSeverity, CrisisStatus, SelectedOption, AlertType, AlertSeverity, AuditDecisionType, RiskLevel, AuditStatus, SyncStatus, Priority, EvidenceType, + survey enums (see Phase 5).

### Seed Data (`prisma/seed.ts`)

Run with `npm run db:seed`. Creates:
- 1 demo user (admin@clear.dev / password123)
- 5 real humanitarian crises: Sudan Armed Conflict, Gaza Humanitarian Crisis, Ethiopia Drought Emergency, DRC Displacement Crisis, Turkiye-Syria Earthquake Recovery
- 4 decisions with real rationale and confidence scores
- 6 alerts across different crises

### Auth (`src/app/(auth)/login/`)

- Email/password sign-in and sign-up with toggle
- Server component checks session, redirects if authenticated
- Client form (`LoginForm`) uses `authClient.signIn.email()` / `authClient.signUp.email()`
- Auth client at `src/lib/auth-client.ts` (client-safe, not under `server/`)
- GitHub OAuth optional — only enabled if `BETTER_AUTH_GITHUB_CLIENT_ID` and `BETTER_AUTH_GITHUB_CLIENT_SECRET` env vars are set

### Layout & Sidebar

- `src/app/(app)/layout.tsx` — SidebarProvider + session check
- `src/components/app-sidebar.tsx` — Navigation links + sign out button
- Root `/` redirects to `/dashboard` or `/login`

---

## Phase 2: Crisis Management & Decisions

### tRPC Routers

**Crisis Router** (`src/server/api/routers/crisis.ts`):
- `list` — Filterable by status, type, severity, search text. Cursor-based pagination (limit default 50). Includes decision/alert counts and creator name.
- `getById` — Full crisis with decisions (+ maker info), alerts, creator info, counts.
- `create` — Validates all fields with Zod. Sets `createdById` from session.
- `update` — Partial updates. Supports changing status, severity, location, etc.
- `delete` — Hard delete by ID.

**Decision Router** (`src/server/api/routers/decision.ts`):
- `list` — Filterable by crisisId. Includes crisis title and maker name.
- `getById`, `create` (verifies crisis exists), `update`, `delete`.

**Alert Router** (`src/server/api/routers/alert.ts`):
- `list` — Filterable by crisisId, isActive, severity.
- `create`, `resolve` (sets isActive=false + resolvedAt), `delete`.

**Dashboard Router** (`src/server/api/routers/dashboard.ts`):
- `stats` — Counts (total/active crises, decisions, alerts) + groupBy severity/type.
- `recentCrises` — Last 5 crises with counts.
- `recentDecisions` — Last 5 decisions with crisis title.
- `activeAlerts` — Up to 10 active alerts with crisis info.

### Pages

**Dashboard** (`/dashboard`):
Server component. 4 stat cards (Total Crises, Active, Decisions Made, Active Alerts). Active alerts panel with severity badges (color-coded). Recent crises and decisions as clickable links.

**Crisis List** (`/crises`):
Server component with URL-based filtering. Table with title, location, type, severity, status, decisions count, alerts count. `CrisisFilters` client component manages filter state via URL search params (search input, status/severity/type dropdowns).

**Crisis Detail** (`/crises/[id]`):
Stats cards (decisions count, alerts count, affected population, severity). Tabbed view:
- Decisions tab — Cards showing title, confidence score, rationale, options (highlighted selected), outcome.
- Alerts tab — List with severity badge, type, message, status, timestamp.
Links to "Add Decision" and "New Alert" (future).

**Create Crisis** (`/crises/new`):
Client form with fields: title, type (dropdown), severity (dropdown), location, latitude, longitude, description, affected population. Uses `api.crisis.create.useMutation()`.

**Create Decision** (`/crises/[id]/decisions/new`):
Client form with fields: title, decision text, rationale, confidence score (range slider 0-100), options A/B/C, selected option dropdown. Uses `api.decision.create.useMutation()`.

---

## Phase 3: External Data Integration

### Live Feeds Service (`src/server/services/live-feeds.ts`)

Server-only service with in-memory cache (5-minute TTL). Three external API integrations:

**USGS Earthquakes** (`fetchEarthquakes(minMagnitude, period)`):
- Fetches from `earthquake.usgs.gov` GeoJSON feed
- Parameters: minMagnitude (default 4.5), period (hour/day/week/month)
- Returns typed `Earthquake[]` with id, magnitude, place, time, lat/lng, depth, url, tsunami flag
- Magnitude mapping: >=4.5 → "significant", >=2.5 → "2.5", else "all"

**ReliefWeb Reports** (`fetchReliefWebReports(country?, limit)`):
- Fetches from `api.reliefweb.int/v1/reports`
- Optional country filter, configurable limit (default 20)
- Returns typed `ReliefWebReport[]` with id, title, url, source, date, country, theme
- Uses appname "clear-mvp" for API identification

**Open-Meteo Weather** (`fetchWeather(latitude, longitude)`):
- Fetches from `api.open-meteo.com/v1/forecast`
- Current conditions: temperature, humidity, wind speed, weather code, precipitation
- Returns typed `WeatherData` with human-readable weather description
- Maps WMO weather codes to descriptions (Clear sky, Thunderstorm, etc.)

**Feed Status** (`checkFeedStatus()`):
- Aggregates health checks for all three feeds (1-minute cache)
- Returns `FeedStatus[]` with name, status (online/error), lastChecked, recordCount

All functions have 10-second timeout (`AbortSignal.timeout`), return empty arrays/null on failure.

### Feeds tRPC Router (`src/server/api/routers/feeds.ts`)

- `earthquakes` — Configurable minMagnitude and period
- `reliefweb` — Optional country filter and limit
- `weather` — Requires latitude/longitude
- `status` — No input, returns all feed health statuses

### Data Feeds Page (`/data`)

Server component. Three sections:
1. **Feed Status Cards** — 3 cards showing each feed's online/error status, last check time, record count
2. **Earthquakes Table** — Top 15 M4.5+ earthquakes this week. Columns: location (linked to USGS), magnitude (color-coded badge: red >=7, orange >=5.5, gray otherwise), depth, time, tsunami flag
3. **ReliefWeb Reports Table** — Latest 10 reports. Columns: title (linked to source), source org, country, date

---

## Phase 4: Mapping & GIS

### Crisis Map Component (`src/components/map/crisis-map.tsx`)

Client component using Mapbox GL JS. Features:
- **Severity-colored markers**: Red (Critical), Orange (High), Yellow (Moderate), Green (Low)
- **Scaled markers**: Critical = 32px, High = 28px, others = 24px
- **Popups**: Click marker to see crisis title, location, severity badge, type badge, affected population, "View details" link
- **Click-through navigation**: "View details" navigates to `/crises/[id]`
- **Graceful fallback**: Shows "Mapbox Token Not Configured" message if `NEXT_PUBLIC_MAPBOX_TOKEN` is not set

### Map View (`src/app/(app)/map/_components/map-view.tsx`)

Client wrapper that:
- Dynamically imports CrisisMap with `next/dynamic` (SSR disabled, shows "Loading map..." placeholder)
- Manages filter state (severity, type, status)
- Shows severity legend
- Displays visible/total crisis count

### Map Filters (`src/app/(app)/map/_components/map-filters.tsx`)

Client component with 3 filter dropdowns:
- Severity: All / Critical / High / Moderate / Low
- Type: All / Natural Disaster / Conflict / Epidemic / etc.
- Status: All / Active / Monitoring / Resolved / Archived
Badge shows "X of Y crises" count.

### Map Page (`/map`)

Server component fetches all crises (limit 100) via `api.crisis.list()`, extracts map-relevant fields, passes to MapView client component.

### Environment

Add `NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token` to `.env`. Get a token from [mapbox.com](https://www.mapbox.com/) (free tier: 50k map loads/month).

---

## Phase 5: Survey System

### Schema Models

**SurveyTemplate** — Reusable survey definition. Fields: name, description, category (SurveyCategory enum), estimatedDuration (minutes), isActive, version. Has many SurveyQuestion[] and Survey[].

**SurveyQuestion** — Question within a template. Fields: questionNumber (ordered), questionText, questionType (QuestionType enum), isRequired, options (JSON — string[] for choice questions), validationRules (JSON), helpText. Unique constraint on [templateId, questionNumber].

**Survey** — Deployed instance of a template. Fields: title, description, status (SurveyStatus), startDate, endDate, targetResponses, isAnonymous, deployedAt, completedAt. Linked to SurveyTemplate, optional Crisis, User (creator). Has many SurveySubmission[].

**SurveySubmission** — A respondent's submission. Fields: respondentId (optional for anonymous), status (SubmissionStatus), startedAt, submittedAt, totalTimeSpent (seconds), location, lat/lng, isComplete. Has many SurveyResponse[].

**SurveyResponse** — Individual answer. Fields: responseText, responseNumber, responseBoolean, responseDate, responseJson (for multi-select etc.), isSkipped. Unique constraint on [submissionId, questionId].

### Enums

**SurveyCategory**: RAPID_ASSESSMENT, MONITORING, EVALUATION, FEEDBACK, REGISTRATION, NEEDS_ASSESSMENT, POST_DISTRIBUTION, BASELINE, ENDLINE, OTHER

**QuestionType**: TEXT, TEXTAREA, NUMBER, DATE, SINGLE_CHOICE, MULTIPLE_CHOICE, SCALE, LOCATION, BOOLEAN

**SurveyStatus**: DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED

**SubmissionStatus**: IN_PROGRESS, COMPLETED, ABANDONED

### Survey tRPC Router (`src/server/api/routers/survey.ts`)

**Template procedures:**
- `templates` — List all templates, filterable by category and isActive. Includes question/survey counts and creator name.
- `templateById` — Full template with questions (ordered), deployed surveys (with submission counts), creator.
- `createTemplate` — Creates template with questions in one transaction. Questions auto-numbered.
- `updateTemplate` — Partial update of template metadata.

**Question procedures:**
- `addQuestion` — Adds question to template, auto-assigns next question number.
- `updateQuestion` — Partial update of question fields.
- `deleteQuestion` — Remove question by ID.

**Survey procedures:**
- `surveys` — List deployed surveys, filterable by status and crisisId. Includes template name, crisis info, submission counts.
- `deploySurvey` — Creates active survey from template. Verifies template exists. Sets deployedAt.
- `updateSurveyStatus` — Change survey status. Auto-sets completedAt when status is COMPLETED.

**Submission procedures:**
- `submitResponse` — Submits all answers in one transaction. Verifies survey exists and is ACTIVE. Creates SurveySubmission + SurveyResponse[] records.
- `surveyResponses` — Returns full survey with template questions and all completed submissions with responses.

### Pages

**Survey Hub** (`/surveys`):
Tabbed view:
- **Templates tab** — Card grid showing template name, category, estimated duration, question count, deployment count, active/inactive badge, creator. Click through to template detail.
- **Deployed Surveys tab** — Table with title, template name, linked crisis, status badge, response count (with target if set), creation date.

**Create Template** (`/surveys/new`):
Form with:
- Template details: name, category dropdown, description, estimated duration
- Dynamic question builder:
  - Add/remove questions
  - Per question: question type selector, question text input, help text input, required toggle
  - For SINGLE_CHOICE and MULTIPLE_CHOICE: dynamic options list (add/remove options)
  - Question types: Short Text, Long Text, Number, Date, Single Choice, Multiple Choice, Scale (1-10), Location, Yes/No

**Template Detail** (`/surveys/[id]`):
- Header with name, category, duration, question count, active/inactive badge
- Questions list showing number, text, type badge, required badge, help text, options (for choice questions)
- "Preview" button and "Deploy Survey" button
- Deployed surveys table (if any) with title, status, response count, deployed date, "View Responses" link

**Deploy Survey Dialog** (`/surveys/[id]` — DeploySurveyButton):
Modal dialog to create a live survey from the template. Fields: survey title (pre-filled with template name), target responses (optional). Creates survey with ACTIVE status.

**Survey Preview** (`/surveys/[id]/preview`):
Read-only preview showing how respondents see each question:
- TEXT → disabled text input
- TEXTAREA → disabled textarea
- NUMBER → disabled number input
- DATE → disabled date input
- SINGLE_CHOICE → radio buttons with options
- MULTIPLE_CHOICE → checkboxes with options
- SCALE → numbered boxes 1-10
- BOOLEAN → Yes/No radio buttons
- LOCATION → lat/lng input pair

**Response Analytics** (`/surveys/[id]/responses/[surveyId]`):
- Summary cards: total responses, completion rate, question count, status
- Per-question breakdown:
  - Choice questions → horizontal bar chart showing option distribution (count + percentage)
  - Number/Scale questions → average value
  - Text questions → "X text responses collected"
  - Boolean questions → Yes/No distribution bars

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Prod only | Auth secret key |
| `BETTER_AUTH_GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `BETTER_AUTH_GITHUB_CLIENT_SECRET` | No | GitHub OAuth client secret |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox GL access token for crisis map |

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server |
| `build` | `npm run build` | Production build |
| `db:push` | `npx prisma db push` | Push schema changes to database |
| `db:seed` | `npm run db:seed` | Seed database with demo data |
| `db:studio` | `npx prisma studio` | Open Prisma Studio GUI |

---

## Remaining Phases

- **Phase 6** — Audit Trail & Feedback (audit viewer, evidence attachments, feedback widget)
- **Phase 7** — Secure Referrals (AES-256-GCM encrypted beneficiary referrals)
- **Phase 8** — KoBoToolbox Integration (form sync, submission retrieval)
- **Phase 9** — Vulnerability Scoring (household assessment, scoring algorithm)
- **Phase 10** — Data Source Intelligence (gap analysis, partner matching)
- **Phase 11** — Polish (i18n, dark mode, onboarding, PDF/CSV export)
