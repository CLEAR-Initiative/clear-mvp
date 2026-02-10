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
Dashboard, Crises, Data Feeds, Map, Surveys, Assessments, Referrals, Audit Trail, Settings

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

## Phase 6: Audit Trail & Feedback

### Schema

**Feedback** — User feedback with type (FeedbackType), pageUrl, feedbackText, rating (1-5), category, priority (FeedbackPriority), status (FeedbackStatus), screenshotUrl, sessionId, userAgent, deviceType. Linked to optional User.

### Audit tRPC Router (`src/server/api/routers/audit.ts`)

- `list` — Filterable by status, type, riskLevel, search text. Cursor-based pagination. Includes creator name.
- `getById` — Full audit decision with creator info and evidence attachments.
- `create` — Creates audit decision with title, type, decisionMade, rationale, riskLevel, informationSources (JSON), stakeholders (JSON), alternatives, location, priority.
- `updateStatus` — Change audit status (DRAFT → SUBMITTED → SYNCED → ARCHIVED).
- `addEvidence` — Attach evidence file metadata (filename, type, size, hash).
- `stats` — Aggregate counts grouped by riskLevel, status, and type.

### Feedback tRPC Router (`src/server/api/routers/feedback.ts`)

- `submit` — Creates feedback with type, pageUrl, feedbackText, rating, userAgent. Auto-sets userId from session.
- `list` — Filterable by type, status, priority. Cursor pagination with user info.
- `updateStatus` — Change feedback status + optional priority update.
- `analytics` — Total counts, grouped by type, priority, and status. Average rating.

### Pages

**Audit Trail** (`/audit`):
Server component. Stat cards (total, by risk level). Filter bar (status, type, risk level). Table with title, type label, risk badge (color-coded), status, priority, creator, date. Click through to detail.

**Audit Detail** (`/audit/[id]`):
Header with title, risk badge, status badge, type label, creator, date. Two-column layout:
- Decision card: decision text, rationale, alternatives (if any)
- Context card: priority, sync status, information sources (badges), stakeholders (badges), tags, location with coordinates, integrity hash

Evidence table: filename, type badge, size (formatted), upload date.

**Record Decision** (`/audit/new`):
Multi-card form:
- Decision Details: title, type dropdown, decision text, rationale, alternatives
- Risk & Priority: risk level dropdown, priority dropdown, location
- Sources & Stakeholders: dynamic add/remove lists with badges (Enter key or + button)

### Feedback Widget (`src/components/feedback-widget.tsx`)

Floating button (bottom-right corner) that opens a Sheet panel:
- Type selector: General, Bug Report, Feature Request, Page Comment, Flow Rating
- Textarea for feedback text
- 1-5 rating buttons (toggle on/off)
- Auto-captures current pathname and browser userAgent
- Shows "Thank you" message on success, auto-closes after 1.5s

Included in the app layout (`src/app/(app)/layout.tsx`) so it's available on every authenticated page.

---

## Phase 7: Secure Referrals

### Schema

**PartnerOrganization** — Partner NGOs/UN agencies. Fields: name, organizationType (OrganizationType enum: UN_AGENCY, INGO, LOCAL_NGO, GOVERNMENT, RED_CROSS_CRESCENT, COMMUNITY_BASED, PRIVATE_SECTOR, OTHER_ORG), sector, contactEmail, contactPhone, serviceTypes (JSON string[]), operationalAreas (JSON string[]), isVerified, isActive.

**Referral** — Encrypted beneficiary referral between organizations. Fields: referralType (ReferralType enum: INDIVIDUAL_CASE, FAMILY_CASE, GROUP_REFERRAL, EMERGENCY_TRANSFER, INFORMATION_SHARING), urgency (ReferralUrgency: ROUTINE, PRIORITY, URGENT, EMERGENCY), status (ReferralStatus: DRAFT → SENT → RECEIVED → ACCEPTED → IN_PROGRESS → COMPLETED/REJECTED/CANCELLED/EXPIRED), fromOrganizationId, toOrganizationId, serviceRequested, beneficiaryData (encrypted ciphertext), encryptionIv, encryptionSalt, encryptionTag, notes, sentById, receivedById, timestamps (sent/received/completed/expires).

**ReferralConsent** — Consent tracking. Fields: consentType (ConsentType: DATA_SHARING, SERVICE_PROVISION, CROSS_BORDER_TRANSFER, THIRD_PARTY_DISCLOSURE), isGranted, grantedBy, consentText, digitalSignature, grantedAt, expiresAt.

### Encryption Service (`src/server/services/secure-referral.ts`)

AES-256-GCM encryption for sensitive beneficiary data:
- PBKDF2 key derivation (100,000 iterations, SHA-512) from master key
- Per-referral unique salt (128-bit) and IV (96-bit)
- Auth tags (128-bit) for integrity verification
- Master key from `REFERRAL_ENCRYPTION_KEY` env var (generate with `openssl rand -hex 32`)
- `encryptBeneficiaryData(data)` → `{ ciphertext, iv, salt, tag }` (all hex-encoded)
- `decryptBeneficiaryData(payload)` → original JSON object

### Referral tRPC Router (`src/server/api/routers/referral.ts`)

- `list` — Filterable by status, urgency, type, search. Includes from/to org names, sender/receiver info, consent count.
- `getById` — Full referral with org details, user info, consent records. Beneficiary data stays encrypted.
- `decryptData` — Separate mutation for explicit decryption (access control boundary).
- `create` — Encrypts beneficiary data, creates referral + optional consent records in one transaction.
- `updateStatus` — Status workflow transitions. Auto-sets sentAt, receivedAt, completedAt, receivedById as appropriate.
- `listPartners` — Filterable by type, active status, search. Sorted alphabetically.
- `createPartner` — Register new partner organization.
- `stats` — Total referrals, grouped by status and urgency, active partner count.

### Pages

**Referrals List** (`/referrals`):
Stat cards (total, active/sent, completed, partners). Filter bar (status, urgency, type). Table with referral type (linked to detail), from/to org, service requested, urgency badge, status badge, date.

**Referral Detail** (`/referrals/[id]`):
Header with type label, urgency badge, status badge, creator, date. Status update dropdown (valid next states based on current status). Two-column layout:
- Organizations card: from/to org with name, type label, sector
- Service Details card: service requested, notes, timeline dates (sent/received/completed/expires)

Beneficiary Data card: encrypted notice with "Decrypt Data" button. On decrypt: shows key-value grid of beneficiary fields. "Re-encrypt" button to clear decrypted view.

Consent Records table: type, granted/not-granted badge, granted by, date, expiry.

**New Referral** (`/referrals/new`):
Multi-card form:
- Referral Details: type, urgency, from/to organization dropdowns (fetched from partners), service requested, notes
- Beneficiary Data: dynamic key-value fields (starts with fullName, age, gender, nationality). Add custom fields. Shield icon indicates encryption. Shows "encrypted using AES-256-GCM" notice.
- Consent: checkboxes for data sharing and service provision consent, "granted by" name field

---

## Phase 8: KoBoToolbox Integration

### Schema

**KoboDeployment** — Tracks surveys exported to KoBo. Fields: surveyId, koboAssetUid (unique), koboFormTitle, deploymentUrl (Enketo web form), lastSyncedAt, syncStatus (KoboSyncStatus: PENDING, SYNCING, SYNCED, FAILED), syncError, submissionCount. Linked to Survey.

### KoBoToolbox Service (`src/server/services/kobotoolbox.ts`)

TypeScript client for KoBoToolbox REST API v2:
- Token-based auth (`Authorization: Token ...`)
- Configurable server URL (default: `kf.kobotoolbox.org`)
- Retry logic: 3 attempts with exponential backoff
- Rate limit handling: respects HTTP 429 + `retry-after` header
- 30-second timeout per request

**Functions:**
- `validateConnection()` — Tests credentials by fetching user profile. Returns connected status + username.
- `listAssets(limit, offset)` — Browse KoBo survey forms. Returns paginated asset list.
- `getAsset(uid)` — Get single KoBo asset details.
- `exportSurvey(survey)` — Converts CLEAR survey template to KoBo-compatible format. Builds XLSForm content with question type mapping (TEXT→text, NUMBER→integer, SINGLE_CHOICE→select_one, MULTIPLE_CHOICE→select_multiple, DATE→date, LOCATION→geopoint, SCALE→range). Creates KoBo asset via API.
- `deployAsset(uid)` — Activates asset for data collection.
- `getSubmissions(uid, options)` — Fetches responses with optional date filtering and pagination.

### KoBo tRPC Router (`src/server/api/routers/kobo.ts`)

- `validateConnection` — Test KoBo API credentials.
- `listAssets` — Browse KoBo forms with pagination.
- `exportSurvey` — Full pipeline: finds survey → exports to KoBo → deploys → tracks in KoboDeployment table.
- `syncResponses` — Pull submissions from KoBo → create SurveySubmission + SurveyResponse records. Handles geolocation, question type mapping (number, multi-choice, text). Updates sync status + submission count.
- `listDeployments` — View all KoBo deployments with linked survey info.

### Pages

**Settings — KoBoToolbox** (`/settings`):
Tabbed settings page (KoBoToolbox / General). KoBo tab has:
- Connection Card: shows connected status (green badge) with username and server URL, or setup instructions with env var names. "Test Connection" button with loading spinner.
- Deployments Card: table of all KoBo deployments with survey name, asset UID, submission count, sync status badge (PENDING/SYNCING/SYNCED/FAILED), last synced time, sync button per row.

**Survey Detail — KoBo Export** (`/surveys/[id]`):
"Export to KoBo" button (appears when template has deployed surveys). Opens dialog to select which deployed survey to export. Creates KoBo asset + deploys automatically.

### Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `KOBO_API_TOKEN` | No | KoBoToolbox API token (from account settings) |
| `KOBO_SERVER_URL` | No | KoBo server URL (default: `https://kf.kobotoolbox.org`) |

---

## Phase 9: Vulnerability Scoring & Assessment

### Schema

**QuickProfile** — Rapid 60-second household assessment. Fields: siteId, householdSize, femaleHeaded, hasVulnerable, pwdCount (persons with disabilities), elderlyCount, childHeaded, primaryNeed (PrimaryNeedType: FOOD, SHELTER, WASH, HEALTH, PROTECTION), serviceDistance (km), gbvRisk, lat/lng, vulnerabilityScore (0-100), riskCategory (RiskCategory: CRITICAL, HIGH, MEDIUM_RISK, LOW_RISK), priorityRank (1-5), assessmentDuration (seconds), assessedById. Linked to User (assessor) and VulnerabilityScore (detail).

**VulnerabilityScore** — Detailed score breakdown. Fields: totalScore, riskCategory, priorityRank, femaleHeadedScore, vulnerableMembersScore, householdSizeScore, primaryNeedScore, serviceDistanceScore, gbvRiskScore, eligiblePrograms (JSON string[]). One-to-one with QuickProfile.

### Vulnerability Scoring Service (`src/server/services/vulnerability-scorer.ts`)

Sudan RNA (Rapid Needs Assessment) methodology. Calculates household vulnerability on a 0-100 scale with six weighted components:

| Component | Max Points | Condition |
|-----------|-----------|-----------|
| Female-headed HH | +25 | femaleHeaded = true |
| Vulnerable members | +20-65 | Base +20, +5 per PWD, +3 per elderly, +30 if child-headed |
| Household size | +8-15 | >6 members = +15, >4 = +8 |
| Primary need | +15-20 | food=20, protection=19, health=18, wash=17, shelter=15 |
| Distance from services | +10-15 | >10km = +15, >5km = +10 |
| GBV risk | +20 | gbvRisk = true |

**Category thresholds:** Critical (>=70), High (50-69), Medium (30-49), Low (<30)
**Priority ranking:** P1 (>=70), P2 (>=60), P3 (>=50), P4 (>=40), P5 (<40)
**Program eligibility:** Auto-detected based on indicators (cash at 50+, food at 40+, GBV services, PWD support, child protection, etc.)

**Functions:**
- `calculateVulnerabilityScore(input)` — Returns total, category, rank, eligible programs, breakdown
- `batchScoreHouseholds(households[])` — Batch score and sort by severity
- `generateTargetingRecommendations(results[])` — Aggregate stats: counts by category, cash/food eligible, average score

### Assessment tRPC Router (`src/server/api/routers/assessment.ts`)

- `list` — Filterable by riskCategory, search. Cursor pagination. Includes assessor name and vulnerability detail.
- `getById` — Full profile with score breakdown, assessor info.
- `create` — Rapid assessment: auto-calculates score → saves QuickProfile + VulnerabilityScore in one transaction. Captures assessment duration.
- `preview` — Live score calculation without saving (for real-time UI feedback).
- `stats` — Targeting recommendations: total households, counts by category, cash/food eligible, average score. Also groups by primary need.

### Pages

**Assessments List** (`/assessments`):
Stat cards (total households, critical count in red, cash eligible with score threshold, average score). Risk category filter. Table with site, HH size, primary need, score (monospaced bold), risk badge (color-coded), priority rank, assessor, date.

**Assessment Detail** (`/assessments/[id]`):
Header with site name, risk badge, priority badge, assessor, date, duration. Score overview card: large circular score display (out of 100) + horizontal breakdown bars for each of the 6 scoring components (showing value/max with proportional fill). Two-column layout:
- Household Profile: grid of all data fields (size, need, female-headed, vulnerable indicators, distance, coordinates)
- Eligible Programs: badges for all auto-detected program eligibilities

**Rapid Assessment Form** (`/assessments/new`):
Multi-card form with **live score preview** that updates in real-time as fields change:
- Live preview card: score circle, risk badge, priority rank, top 3 eligible programs
- Household Information: site ID, household size, primary need dropdown, service distance
- Vulnerability Indicators: checkboxes for female-headed (+25), vulnerable members (+20), GBV risk (+20), child-headed (+30). Conditional PWD count and elderly count fields (appear when "has vulnerable" is checked, showing point values)

Assessment duration auto-tracked from page load to submission.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Prod only | Auth secret key |
| `BETTER_AUTH_GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `BETTER_AUTH_GITHUB_CLIENT_SECRET` | No | GitHub OAuth client secret |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox GL access token for crisis map |
| `REFERRAL_ENCRYPTION_KEY` | No | AES-256 key for referral encryption (`openssl rand -hex 32`) |
| `KOBO_API_TOKEN` | No | KoBoToolbox API token |
| `KOBO_SERVER_URL` | No | KoBo server URL (default: `https://kf.kobotoolbox.org`) |

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

## Phase 10: Data Source Intelligence

### Schema

**DataSource** — Registered data sources. Fields: name, sourceType (DataSourceType enum: API, DATABASE, SURVEY, MANUAL, SATELLITE, IOT, SOCIAL_MEDIA, OTHER_SOURCE), sector, apiEndpoint, updateFrequency (daily/weekly/monthly/quarterly), coverageAreas (JSON string[]), populations (JSON string[]), indicators (JSON string[]), qualityLevel (high/medium/low), accessLevel (public/partner/restricted), isActive, reliabilityScore (0-1), lastSyncedAt, lastSyncStatus, metadata (JSON). Indexed by sector, isActive, sourceType.

**DataSourceAvailability** — Availability check logs. Fields: sourceId, isAvailable, responseTime (ms), errorMessage, recordCount, checkedAt. Linked to DataSource (cascade delete).

**DataQualityMetric** — Quality measurements. Fields: sourceId, indicator, qualityDimension (QualityDimension enum: COMPLETENESS, ACCURACY, CONSISTENCY, TIMELINESS, VALIDITY), score (0-1), threshold (default 0.7), isPassing, details (JSON), measuredAt. Linked to DataSource (cascade delete).

### Data Intelligence Service (`src/server/services/data-intelligence.ts`)

Pure-function analysis engine (no DB dependency):

**Sector-Indicator Mapping** — 7 humanitarian sectors mapped to required indicators:
- Protection (4): protection_incidents, gbv_incidents, child_protection_cases, documentation_status
- Health (4): mortality_rates, vaccination_coverage, disease_outbreaks, mental_health_cases
- Nutrition (3): malnutrition_rates, food_consumption_score, dietary_diversity
- WASH (4): water_quantity, water_quality, sanitation_coverage, waterborne_diseases
- Shelter (4): shelter_adequacy, overcrowding, structural_safety, tenure_security
- Education (3): enrollment_rates, learning_outcomes, teacher_student_ratio
- Livelihoods (3): income_sources, employment_rates, market_functionality

**Partner Source Catalog** — 7 humanitarian data partners (UNHCR, WFP, WHO, UNICEF, OCHA, ACAPS, HDX) with sector coverage, data types, API endpoints, update frequency, quality rating, access level.

**Functions:**
- `checkDataAvailability(request, existingSources)` — Analyzes coverage per sector. Returns per-sector availability (coverage %, status, missing indicators, recommended partner sources ranked by relevance), overall confidence score.
- `performGapAnalysis(sectors, existingSources, crisisType?)` — Identifies missing indicators with severity (critical for life-threatening indicators, escalated by crisis type), suggested collection methods, estimated costs, timeframes. Generates prioritized recommendations grouped by sector.

### Data Source tRPC Router (`src/server/api/routers/data-source.ts`)

- `list` — Filterable by sector, sourceType, isActive. Cursor pagination. Includes availability/metric counts.
- `getById` — Full source with recent availability logs (20) and quality metrics (20).
- `create` — Register new data source with all fields.
- `update` — Partial update of any data source field.
- `delete` — Remove data source (cascades to logs/metrics).
- `logAvailability` — Record availability check result. Auto-updates source lastSyncedAt/lastSyncStatus.
- `logQuality` — Record quality metric. Auto-calculates isPassing from score vs threshold.
- `checkAvailability` — In-memory analysis: pulls active DB sources for selected sectors, runs `checkDataAvailability()`.
- `gapAnalysis` — In-memory analysis: pulls active DB sources, runs `performGapAnalysis()`.
- `partnerSources` — Static partner catalog, optionally filtered by sector.
- `sectorIndicators` — Static sector-indicator mapping with counts.
- `stats` — Aggregate: total/active sources, recent outages (24h), failing quality metrics.

### Pages

**Data page** (`/data`) now has three tabs:

**Live Feeds tab** (existing): Feed status cards, earthquake table, ReliefWeb reports table.

**Data Sources tab**:
- Stats cards: total sources, active, recent outages (24h), failing metrics
- Registered Sources table: name, type, sector, quality badge, frequency, active status badge, last sync date
- Partner Source Catalog table: partner name, type, sector badges, data types, update frequency, quality badge, access level badge

**Gap Analysis tab**:
- Sector selector: toggle buttons for all 7 sectors with indicator counts
- Data Availability card: summary stats (required/fully/partially/not available), per-sector table with coverage bar, status dot, available/total counts, missing indicator badges, primary collection needed flag
- Gap Details table: indicator name, sector, severity badge (critical/high/medium), collection method, estimated cost, timeframe
- Recommendations card: prioritized action cards with urgency badge, sector, and recommendation text

---

## Remaining Phases

- **Phase 11** — Polish (i18n with next-intl, dark mode, onboarding tour, PDF/CSV export)
