# CLEAR‑MVP — Role Access QA / E2E Test Matrix

Machine- and human-readable test matrix for **role-based access control** in clear‑mvp.
Generated from source (`src/lib/roles.ts`, `src/lib/inbox-access.ts`, `src/lib/ground-review.ts`,
`src/middleware.ts`, `src/server/api/**`, and the page components). Companion to the interactive
checklist artifact.

> **Important:** clear‑mvp mostly *hides dead UI*; the real authorization gate is **clear‑api**
> (reached by forwarding the session cookie). So a row's **UI expectation** is what clear‑mvp renders,
> and the **Server expectation** is what clear‑api returns when the action is actually invoked. A
> `403` row often has a *visible* control — the assertion is that the server rejects it, surfaced as a
> toast/disabled state, not a crash.

## How an agent should consume this

- Each test case has a stable **`id`** of the form `<item>__<persona>` (same ids the checklist uses).
- **`ui`** ∈ `enabled | hidden | disabled | read-only | conditional | n/a` → the DOM assertion.
- **`server`** ∈ `200 | 403 | 200-own | public | n/a` → the network/outcome assertion.
- **`selectors`** are `data-testid` values (use `page.getByTestId(...)`) or described locators.
- **`flags`** must be ON in the env, else the surface is absent (see §2).
- The authoritative machine form is the **JSON block in the Appendix** — parse that; the tables below mirror it.

### UI assertion mapping (Playwright)

| `ui` | Assertion |
| --- | --- |
| `enabled` | `await expect(getByTestId(sel)).toBeEnabled()` |
| `hidden` | `await expect(getByTestId(sel)).toHaveCount(0)` |
| `disabled` | `await expect(getByTestId(sel)).toBeDisabled()` (often `[data-disabled]` + tooltip) |
| `read-only` | control visible, decision buttons absent (`toHaveCount(0)` on the action) |
| `conditional` | depends on per-record policy (e.g. source `reviewerRoles`) — see note |
| `n/a` | not applicable to this persona on this surface |

### Server assertion mapping

| `server` | Assertion |
| --- | --- |
| `200` | action succeeds (row/toast/state change) |
| `403` | action invoked → clear‑api `FORBIDDEN`; surfaced as error toast/disabled, no state change |
| `200-own` | succeeds but scoped to the caller's own records only |
| `public` | token/credential flow, no in-app role required |
| `n/a` | control absent, nothing to invoke |

---

## 1. Test personas (setup)

| `persona` | Global role | Org/Team role | How to provision |
| --- | --- | --- | --- |
| `admin` | `admin` | — | `/admin` → Users → role dropdown → **admin** (or seed). Bypasses every org/team gate. |
| `analyst` | `member` | team `analyst` | Global **member** + team **analyst** membership. Elevated, LOCATION-SCOPED powers (promote alerts, decide tasks/case proposals, manage analyses, act on events/alerts/crises within the team's location scope). The E2E seed team has NO teamLocations ("wide-open"), so its powers succeed everywhere. Not platform admin; NOT on the hotline/ground inbox (that is the ERM's job). |
| `member` | `member` | none privileged | `/admin` → role **member** (default after approval; formerly `viewer`). Plain read-only reader. |
| `erm` | `member` | team `emergency_response_manager` | Global **member** + assign ERM via **Settings → Team → role** or **Settings → Org → invite**. In the admin table the global role still shows **member**. |
| `pending` | `pending` | — | A new invited/accepted user **before** `/admin → Approve`. Refused all content reads. |
| `team_admin` | `member` | team `team_admin` | Settings → Team → role **team_admin**. |
| `org_admin` | `member` | org `org_admin` | Settings → Org → member role **org_admin**. |
| `team_member` | `member` | team `team_member` | Settings → Team → role **team_member** (default). Now a content writer within its team's scope. |

App is **invite-only** (no self-signup route).

## 2. Feature flag prerequisites (`/admin → Features`)

| Flag | Default | Gates |
| --- | --- | --- |
| `hotline_inbox` | OFF | Hotline threads in `/inbox` + Inbox nav (admin/ERM) |
| `impact_prior_review` | OFF | Proposed-signal Review items, Accept/Reject, nav badge |
| `event_enrichment` | OFF | Request-enrichment, Enrichment section, "My requests" |
| `hotline_translation` | OFF | Translate control in hotline reading pane (needs `hotline_inbox`) |
| `ground_intel` | ON | Detection → Ground Intel tab (admin / team analyst — tab renders; ground server calls are admin + ERM only) |

> Enable the OFF flags in the target env **before** role-testing, or the Inbox/enrichment surfaces won't render at all.

## 3. Routes

| Surface | Route |
| --- | --- |
| Admin console | `/admin` |
| Hotline inbox | `/inbox` |
| Event detail | `/event/[id]` |
| Crisis detail | `/crisis/[id]` |
| Detection | `/detection` (`?tab=ground` for Ground Intel) |
| Signal detail | `/signal/[id]` |
| Insights / Analysis | `/insights` |
| Settings — Org | `/settings/org` |
| Settings — Team | `/settings/team/[id]` |
| Accept invite | `/accept-invite?token=…` |
| Verify email | `/verify-email/[token]` |
| Login | `/auth/login` |
| No access | `/no-access` |

---

## 4. Test cases by persona

Columns: **ID · Action · Route · UI · Server · Selector(s) · Flags · Source**.

### 4.1 `admin`

| ID | Action | Route | UI | Server | Selectors | Flags | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nav-admin__admin` | Open /admin + see Admin nav link | `/admin` | enabled | 200 | `a[href="/admin"]` | — | middleware.ts:100 |
| `nav-ops__admin` | See Operations / Cash Assistance nav | any | enabled | n/a | nav "Operations","Cash Assistance" | — | nav-sidebar.tsx:116 |
| `nav-ground__admin` | Detection → Ground Intel tab | `/detection?tab=ground` | enabled | 200 | tab "Ground Intel" | `ground_intel` | detection/page.tsx:333 |
| `nav-content__admin` | Load content pages | `/overview,/detection,/map,/insights` | enabled | 200 | — | — | roles.ts:44 |
| `nav-agent__admin` | AI Agent drawer / /api/agent | any | enabled | 200 | agent drawer | `agent` | api/agent/route.ts:54 |
| `inbox-see__admin` | Reach the Inbox | `/inbox` | enabled | 200 | — | `hotline_inbox`,`impact_prior_review`,`event_enrichment` | inbox-access.ts:46 |
| `inbox-hotline__admin` | See hotline threads (Reports) | `/inbox` | enabled | 200 | `inbox-filter-reports` | `hotline_inbox` | inbox-access.ts:54 |
| `inbox-triage__admin` | Add to CLEAR / Archive / Reject | `/inbox` | enabled | 200 | `inbox-add`,`inbox-archive`,`inbox-reject`,`inbox-reject-<reason>` | `hotline_inbox` | ground-review.ts:40 |
| `inbox-retry__admin` | Retry failed pipeline stage | `/inbox` | enabled | 200 | `inbox-retry` | — | ground.ts:391 |
| `inbox-translate__admin` | Translate thread | `/inbox` | enabled | 200 | `inbox-translate`,`inbox-translate-retry` | `hotline_translation` | reading-pane.tsx:230 |
| `inbox-proposals__admin` | See proposed signals + badge | `/inbox` | enabled | 200 | `inbox-filter-proposals` | `impact_prior_review` | inbox-access.ts:38 |
| `inbox-decide__admin` | Decide proposal Accept/Reject | `/inbox` | enabled | 200 | `case-proposal-accept`,`case-proposal-reject`,`case-proposal-confirm-reject` | `impact_prior_review` | tasks.ts:365 |
| `inbox-myreq__admin` | "My requests" + cancel | `/inbox` | enabled | 200-own | `inbox-task-cancel` | `event_enrichment` | tasks.ts:448 |
| `ev-alert__admin` | Raise alert / promote | `/event/[id]` | enabled | 200 | "Raise alert" btn | — | alerts.ts:545 |
| `ev-addcrisis__admin` | Add event to crisis | `/event/[id]` | enabled | 200 | Add-to-crisis menu | — | crises.ts:367 |
| `ev-enrich__admin` | Request enrichment | `/event/[id]` | enabled | 200 | `request-enrichment`,`enrichment-confirm-button` | `event_enrichment` | tasks.ts:238 |
| `ev-decide__admin` | Decide proposal (Event page) | `/event/[id]` | enabled | 200 | enrichment-section proposal rows | `event_enrichment`,`impact_prior_review` | enrichment-section.tsx:42 |
| `ev-comment__admin` | Comment + feedback | `/event/[id]` | enabled | 200 | comment composer, feedback thumbs | — | comments.ts:89 |
| `cr-title__admin` | Rename crisis title | `/crisis/[id]` | enabled | 200 | title pencil | — | crises.ts:467 |
| `cr-summary__admin` | Edit summary/population | `/crisis/[id]` | enabled | 200 | summary pencil | — | crises.ts:482 |
| `cr-delete__admin` | Delete crisis | `/crisis/[id]` | enabled | 200 | kebab → delete | — | crises.ts:455 |
| `cr-addev__admin` | Add events to crisis | `/crisis/[id]` | enabled | 200 | `crisis-add-event-<id>` | — | crises.ts:367 |
| `cr-rmev__admin` | Remove event from crisis | `/crisis/[id]` | enabled | 200 | event row → remove | — | crises.ts:444 |
| `cr-doc__admin` | Upload / remove crisis document | `/crisis/[id]` | enabled | 200 | upload btn, doc trash | — | crises.ts:345 |
| `det-signal__admin` | Create signal (manual) | `/detection` | enabled | 200 | Create signal modal | — | signals.ts:339 |
| `det-bulk__admin` | Bulk Raise alert / Add to crisis | `/detection` | enabled | 200 | `bulk-raise-alert` | — | event-bulk-bar.tsx:33 |
| `det-sev__admin` | Update signal severity | `/inbox`,`/signal/[id]` | enabled | 200 | severity control | — | signals.ts:375 |
| `det-loc__admin` | Update signal location | `/signal/[id]` | enabled | 200 | location control | — | signals.ts:388 |
| `det-ground__admin` | Review ground thread (drawer) | `/detection?tab=ground` | enabled | 200 | `ground-approve-private`,`ground-approve-public`,`ground-confirm-publish`,`ground-reject` | `ground_intel` | ground-thread-drawer.tsx:187 |
| `an-new__admin` | Create analysis automation | `/insights` | enabled | 200 | `analysis-new` | `analysis_v2` | analysis.ts:525 |
| `an-manage__admin` | Refresh / cadence / remove analysis | `/insights` | enabled | 200 | refresh/cadence/remove | — | analysis.ts:603 |
| `subs__admin` | Manage own alert subscriptions | settings | enabled | 200-own | subscription form | — | subscriptions.ts:111 |
| `bell__admin` | Notification bell + mark read | any | enabled | 200-own | notifications bell | — | notifications.ts:53 |
| `adm-approve__admin` | Approve pending user | `/admin` | enabled | 200 | activate btn | — | auth.ts:306 |
| `adm-role__admin` | Change user global role | `/admin` | enabled | 200 | role dropdown | — | auth.ts:292 |
| `adm-flag__admin` | Toggle feature flag | `/admin` | enabled | 200 | feature Switch | — | featureFlags.ts:55 |
| `adm-users__admin` | View user list + PII | `/admin` | enabled | 200 | users table | — | auth.ts:253 |

### 4.2 `analyst` (team analyst — elevated, LOCATION-SCOPED; on the wide-open E2E seed team)

Global role `member` + team `analyst`. The seed team has NO teamLocations, so every
location-scoped power succeeds here. NOT on the hotline/ground inbox (admin + ERM only).

| ID | Action | Route | UI | Server | Selectors | Flags | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nav-admin__analyst` | Open /admin | `/admin` | hidden | n/a | redirected → `/dashboard` (assert URL) | — | middleware.ts:100 |
| `nav-ops__analyst` | Operations / Cash nav | any | hidden | n/a | — | — | nav-sidebar.tsx:116 |
| `nav-ground__analyst` | Ground Intel tab | `/detection?tab=ground` | enabled | 200 | tab "Ground Intel" (`canSeeGround` shows it to a team analyst) | `ground_intel` | detection/page.tsx:335 |
| `nav-content__analyst` | Content pages | content routes | enabled | 200 | — | — | roles.ts:78 |
| `nav-agent__analyst` | Agent drawer | any | enabled | 200 | — | `agent` | api/agent/route.ts:54 |
| `inbox-see__analyst` | Reach Inbox | `/inbox` | enabled | 200 | — | `impact_prior_review`/`event_enrichment` | inbox-access.ts:51 |
| `inbox-hotline__analyst` | Hotline threads | `/inbox` | hidden | n/a | no `inbox-filter-reports` (ground inbox is admin + ERM only) | `hotline_inbox` | inbox-access.ts:61 |
| `inbox-triage__analyst` | Triage a thread | `/inbox` | hidden | n/a | ground inbox hidden; `requireGroundInboxAccess` rejects analyst | `hotline_inbox` | ground.resolver.ts:227 |
| `inbox-retry__analyst` | Retry failed stage | `/inbox` | enabled | **403** | `inbox-retry`; `retryGroundMessage` → `requireGroundInboxAccess` (admin + ERM only) | — | ground.resolver.ts:1173 |
| `inbox-proposals__analyst` | Proposed signals + badge (their team) | `/inbox` | enabled | 200 | `inbox-filter-proposals` (team-scoped to the analyst's team) | `impact_prior_review` | task.resolver.ts:275 |
| `inbox-decide__analyst` | Decide proposal (their team) | `/inbox` | enabled | 200 | `case-proposal-accept`,`case-proposal-reject` (scoped to the task's team) | `impact_prior_review` | task.resolver.ts:299 |
| `inbox-myreq__analyst` | My requests + cancel | `/inbox` | enabled | 200-own | `inbox-task-cancel` | `event_enrichment` | tasks.ts:448 |
| `ev-alert__analyst` | Raise alert | `/event/[id]` | enabled | 200 | "Raise alert" | — | alerts.ts:545 |
| `ev-addcrisis__analyst` | Add event to crisis | `/event/[id]` | enabled | 200 | Add-to-crisis | — | crises.ts:367 |
| `ev-enrich__analyst` | Request enrichment | `/event/[id]` | enabled | 200 | `request-enrichment` | `event_enrichment` | tasks.ts:238 |
| `ev-decide__analyst` | Decide proposal (Event page) | `/event/[id]` | enabled | 200 | enrichment-section rows | `event_enrichment`,`impact_prior_review` | enrichment-section.tsx:42 |
| `ev-comment__analyst` | Comment + feedback | `/event/[id]` | enabled | 200 | — | — | comments.ts:89 |
| `cr-title__analyst` | Rename crisis title | `/crisis/[id]` | enabled | 200 | title pencil | — | crises.ts:467 |
| `cr-summary__analyst` | Edit summary | `/crisis/[id]` | hidden | n/a | no summary pencil | — | crises.ts:482 |
| `cr-delete__analyst` | Delete crisis | `/crisis/[id]` | hidden | n/a | no kebab | — | crises.ts:455 |
| `cr-addev__analyst` | Add events to crisis | `/crisis/[id]` | enabled | 200 | `crisis-add-event-<id>` | — | crises.ts:367 |
| `cr-rmev__analyst` | Remove event from crisis | `/crisis/[id]` | hidden | n/a | — | — | crises.ts:444 |
| `cr-doc__analyst` | Upload/remove crisis document | `/crisis/[id]` | enabled | 200 | upload/trash | — | crises.ts:345 |
| `det-signal__analyst` | Create signal | `/detection` | enabled | 200 | Create signal modal | — | signals.ts:339 |
| `det-bulk__analyst` | Bulk raise/add | `/detection` | enabled | 200 | `bulk-raise-alert` | — | event-bulk-bar.tsx:33 |
| `det-sev__analyst` | Update severity | `/inbox` | enabled | 200 | severity control (location-scoped; wide-open team → succeeds) | — | signal.resolver.ts:600 |
| `det-loc__analyst` | Update location | `/signal/[id]` | enabled | **403** | location control; `updateSignalLocation` is still **admin-only** (`requireRole(["admin"])`), NOT location-scoped like severity | — | signal.resolver.ts:671 |
| `det-ground__analyst` | Review ground thread | `/detection?tab=ground` | enabled | **403** | `ground-approve-*` visible (tab/drawer render for a team analyst) but `reviewGroundThread` → `requireGroundInboxAccess` (admin + ERM only) rejects analyst | `ground_intel` | ground.resolver.ts:619 |
| `an-new__analyst` | Create analysis | `/insights` | enabled | 200 | `analysis-new` (needs team membership) | `analysis_v2` | analysis.ts:525 |
| `an-manage__analyst` | Manage analysis | `/insights` | enabled | 200 | refresh/cadence/remove | — | analysis.ts:603 |
| `subs__analyst` | Own subscriptions | settings | enabled | 200-own | — | — | subscriptions.ts:111 |
| `bell__analyst` | Notification bell | any | enabled | 200-own | — | — | notifications.ts:53 |
| `adm-flag__analyst` | Toggle feature flag | `/admin` | n/a | **403** | route blocked; API throws FORBIDDEN | — | featureFlags.ts:55 |

### 4.3 `member` (plain global member — formerly `viewer`)

Read-only reader: content reads allow; every content write blocks / disables / hides.

| ID | Action | Route | UI | Server | Selectors | Flags | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nav-admin__member` | Open /admin | `/admin` | hidden | n/a | redirected → `/dashboard` | — | middleware.ts:100 |
| `nav-ops__member` | Operations / Cash nav | any | hidden | n/a | — | — | nav-sidebar.tsx:116 |
| `nav-ground__member` | Ground Intel tab | `/detection` | hidden | n/a | tab absent | `ground_intel` | detection/page.tsx:335 |
| `nav-content__member` | Content pages | content routes | enabled | 200 | — | — | roles.ts:78 |
| `nav-agent__member` | Agent drawer | any | enabled | 200 | — | `agent` | api/agent/route.ts:54 |
| `inbox-see__member` | Reach Inbox (only "My requests") | `/inbox` | enabled | 200 | present only if `event_enrichment` | `event_enrichment` | inbox-access.ts:51 |
| `inbox-hotline__member` | Hotline threads | `/inbox` | hidden | n/a | — | `hotline_inbox` | inbox-access.ts:61 |
| `inbox-proposals__member` | Proposed signals | `/inbox` | hidden | n/a | — | `impact_prior_review` | inbox-access.ts:39 |
| `inbox-decide__member` | Decide proposal | `/inbox` | read-only | n/a | rows shown, no accept/reject | `impact_prior_review` | case-proposal-row.tsx:70 |
| `inbox-myreq__member` | My requests + cancel own | `/inbox` | enabled | 200-own | `inbox-task-cancel` | `event_enrichment` | task.resolver.ts:625 |
| `ev-alert__member` | Raise alert | `/event/[id]` | disabled | n/a | `[data-disabled]` + tooltip | — | event-detail-content.tsx:155 |
| `ev-addcrisis__member` | Add event to crisis | `/event/[id]` | enabled | **403** | control visible; server rejects | — | crises.ts:367 |
| `ev-enrich__member` | Request enrichment (no team) | `/event/[id]` | disabled | n/a | tooltip; `canWriteCrisisEvents\|\|hasTeam` | `event_enrichment` | request-enrichment-button.tsx:44 |
| `ev-decide__member` | Decide proposal (Event page) | `/event/[id]` | read-only | n/a | rows read-only | `event_enrichment`,`impact_prior_review` | enrichment-section.tsx:42 |
| `ev-comment__member` | Comment + feedback | `/event/[id]` | enabled | 200 | — | — | comments.ts:89 |
| `cr-title__member` | **Rename crisis title** | `/crisis/[id]` | enabled | **200** | ⚠ pencil visible; any-auth server accepts | — | crises.ts:467 |
| `cr-summary__member` | Edit summary | `/crisis/[id]` | hidden | n/a | — | — | crises.ts:482 |
| `cr-delete__member` | Delete crisis | `/crisis/[id]` | hidden | n/a | — | — | crises.ts:455 |
| `cr-addev__member` | Add events to crisis | `/crisis/[id]` | hidden | n/a | button returns null | — | add-events-to-crisis-modal.tsx:263 |
| `cr-doc__member` | Upload/remove crisis document | `/crisis/[id]` | enabled | **403** | control visible; server gates | — | crises.ts:345 |
| `det-signal__member` | Create signal | `/detection` | enabled | **403** | modal visible; server gates (no team) | — | signal.resolver.ts:501 |
| `det-bulk__member` | Bulk raise/add | `/detection` | hidden | n/a | `bulk-raise-alert` absent | — | event-bulk-bar.tsx:33 |
| `det-sev__member` | Update severity | `/inbox` | n/a | **403** | — | — | signal.resolver.ts:600 |
| `det-loc__member` | Update location | `/signal/[id]` | n/a | **403** | — | — | signal.resolver.ts:671 |
| `an-new__member` | Create analysis | `/insights` | hidden | n/a | `analysis-new` absent | `analysis_v2` | analysis-home.tsx:142 |
| `subs__member` | Own subscriptions | settings | enabled | 200-own | — | — | subscriptions.ts:111 |
| `bell__member` | Notification bell | any | enabled | 200-own | — | — | notifications.ts:53 |

### 4.4 `erm` (global `member` + `emergency_response_manager` team role)

| ID | Action | Route | UI | Server | Selectors | Flags | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nav-admin__erm` | Open /admin | `/admin` | hidden | n/a | redirected → `/dashboard` | — | middleware.ts:100 |
| `nav-ground__erm` | Ground Intel tab | `/detection` | hidden | n/a | tab checks role string admin/analyst, not ERM | `ground_intel` | detection/page.tsx:333 |
| `nav-agent__erm` | Agent drawer | any | enabled | 200 | — | `agent` | api/agent/route.ts:54 |
| `inbox-see__erm` | Reach Inbox | `/inbox` | enabled | 200 | — | `hotline_inbox` | inbox-access.ts:46 |
| `inbox-hotline__erm` | **See hotline threads** | `/inbox` | enabled | 200 | `inbox-filter-reports` | `hotline_inbox` | inbox-access.ts:54 |
| `inbox-triage__erm` | **Triage any thread** | `/inbox` | enabled | 200 | `inbox-add`,`inbox-archive`,`inbox-reject` (ERM bypasses reviewerRoles) | `hotline_inbox` | ground-review.ts:40 |
| `inbox-retry__erm` | Retry failed stage | `/inbox` | enabled | 200 | `inbox-retry` | — | ground.ts:391 |
| `inbox-translate__erm` | Translate thread | `/inbox` | enabled | 200 | `inbox-translate` | `hotline_translation` | reading-pane.tsx:230 |
| `inbox-proposals__erm` | See proposed signals | `/inbox` | hidden | n/a | ERM NO LONGER sees case proposals: `requireCaseProposalInboxAccess` admits admin + team-analyst only | `impact_prior_review` | task.resolver.ts:275 |
| `inbox-decide__erm` | Decide proposal (Inbox) | `/inbox` | hidden | n/a | `requireCaseProposalInboxAccess` excludes ERM (admin + team-analyst only) | `impact_prior_review` | task.resolver.ts:299 |
| `inbox-myreq__erm` | My requests | `/inbox` | enabled | 200-own | `inbox-task-cancel` | `event_enrichment` | task.resolver.ts:625 |
| `ev-alert__erm` | Raise alert | `/event/[id]` | disabled | n/a | global member → disabled | — | event-detail-content.tsx:155 |
| `ev-addcrisis__erm` | Add event to crisis | `/event/[id]` | enabled | **403** | visible; server gates | — | crises.ts:367 |
| `ev-enrich__erm` | Request enrichment (on a team) | `/event/[id]` | enabled | 200 | `hasTeam` path | `event_enrichment` | request-enrichment-button.tsx:44 |
| `ev-decide__erm` | Decide proposal (Event page) | `/event/[id]` | read-only | n/a | ERM is not a case-proposal decider → read-only (consistent with Inbox, which no longer admits ERM) | `event_enrichment`,`impact_prior_review` | enrichment-section.tsx:42 |
| `cr-title__erm` | Rename crisis title | `/crisis/[id]` | enabled | 200 | any-auth | — | crises.ts:467 |
| `cr-summary__erm` | Edit summary | `/crisis/[id]` | hidden | n/a | — | — | crises.ts:482 |
| `cr-addev__erm` | Add events to crisis | `/crisis/[id]` | hidden | n/a | — | — | add-events-to-crisis-modal.tsx:263 |
| `det-signal__erm` | Create signal | `/detection` | enabled | **403** | unless on a writer team via teamId | — | signal.resolver.ts:501 |
| `det-sev__erm` | Update severity | `/inbox` | n/a | **403** | global member, not a team analyst | — | signal.resolver.ts:600 |
| `subs__erm` | Own subscriptions | settings | enabled | 200-own | — | — | subscriptions.ts:111 |

### 4.5 `pending`

| ID | Action | Route | UI | Server | Selectors | Flags | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nav-admin__pending` | Open /admin | `/admin` | hidden | n/a | redirected → `/dashboard` | — | middleware.ts:100 |
| `nav-content__pending` | Load content pages | content routes | enabled | **403** | shell loads; content reads refused | — | roles.ts:44 |
| `nav-agent__pending` | Agent / /api/agent | any | n/a | **403** | `canReadContent` false | `agent` | api/agent/route.ts:54 |
| `inbox-see__pending` | Reach Inbox | `/inbox` | hidden | n/a | nav entry absent | — | inbox-access.ts:46 |
| `bell__pending` | Notification bell | any | hidden | n/a | disabled/empty | — | notifications.ts:53 |
| `ev-comment__pending` | Comment / feedback | `/event/[id]` | n/a | **403** | content-reader gate | — | comments.ts:89 |
| `sh-pending__pending` | Refused everywhere until approved | — | n/a | **403** | no "awaiting approval" page; `/no-access` if no org/team | — | onboarding-guard.tsx:27 |

---

## 5. Team & Org role cases

Columns show the expected result per role. UI/server as above; most writes forward to clear‑api.

| ID | Action | Route | `org_admin` | `team_admin` | `team_member` | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `to-createorg` | Create an organisation | `/settings/org`,`/admin` | 403 | 403 | 403 | trpc.ts:103 (platform admin only) |
| `to-orgmembers` | Edit org, add/remove/role org members | `/settings/org` | enabled/200 | 403 | 403 | settings/org/page.tsx:239 |
| `to-createteam` | Create / delete a team | `/settings/org` | enabled/200 | 403 | 403 | teams.ts:300 |
| `to-teammanage` | Edit team, add/remove members, set locations | `/settings/team/[id]` | enabled/200 | enabled/200 | hidden | settings/team/[id]/page.tsx:93 |
| `to-mintERM` | Assign `emergency_response_manager` | `/settings/team/[id]`, Org invite | enabled/200 | enabled/200 | hidden | team/[id]/page.tsx:376; org/page.tsx:627 |
| `to-deleteteam` | Delete a team (Danger Zone) | `/settings/team/[id]` | enabled/200 | hidden | hidden | team/[id]/page.tsx:384 |
| `to-invite` | Invite member (org role + ≥1 team role) | `/settings/org` | enabled/200 | 403 | 403 | invitations.ts:146 |
| `to-write` | Create signal/event/crisis/enrichment via teamId | `/detection`,`/event/[id]` | 403 | enabled/200 | enabled/200 | auth-guard.ts:39 (`TEAM_CONTENT_WRITER_ROLES`); signals.ts:353; events.ts:366; crises.ts:331 |

Notes:
- Only **Settings → Team role change** and the **Settings → Org invite** modal expose the ERM role; the admin-tab and org-wizard invite forms do **not**.
- A `team_admin` can manage roles but **cannot delete** the team (Danger Zone is org_admin+).
- `TEAM_CONTENT_WRITER_ROLES` is now `{team_admin, analyst, emergency_response_manager, team_member}` — **any** team membership (incl. `team_member`) can write content on behalf of its team. The `teamId` "authorization hint" is what lets them write; test both **with** a matching team and **without** (without a team → 403). `org_admin` is an ORG role with no team membership → 403.

## 6. Shared flows (token / credential — test once)

| ID | Action | Route | Server | Notes | Source |
| --- | --- | --- | --- | --- | --- |
| `sh-login` | Sign in (valid creds) | `/auth/login` | public | invite-only; `callbackUrl` sanitized to internal paths | auth/login/page.tsx:78 |
| `sh-accept` | Accept invite (name + password ≥8) | `/accept-invite?token=…` | public | creates account, auto-login → `/welcome/profile`; re-use errors cleanly | invitations.ts:177 |
| `sh-verify` | Verify email | `/verify-email/[token]` | public | already-verified returns friendly state | auth.ts:188 |
| `sh-reset` | Request + complete password reset | `/auth/forgot-password`,`/auth/reset-password` | public | token-guarded | invitations.ts:218 |
| `sh-noaccess` | No org + no team → `/no-access` | `/no-access` | n/a | OnboardingGuard | onboarding-guard.tsx:27 |

## 7. Gotchas — explicit regression checks

| ID | Check | Expected | Source |
| --- | --- | --- | --- |
| `g-title` | Member renames crisis title but cannot edit summary | title rename **200**; summary edit hidden/403 | crises.ts:467 vs :482 |
| `g-loc` | Team analyst sets severity but NOT location | severity **200** (location-scoped `requireAdminOrTeamAnalystForLocations`); location **403** (`updateSignalLocation` is still admin-only `requireRole(["admin"])`) | signal.resolver.ts:600 vs :671 |
| `g-ground` | Detection Ground tab renders for a team analyst but every ground call 403s | tab visible (`canSeeGround` admits team analyst); `det-ground` review / `inbox-retry` → **403** (`requireGroundInboxAccess` admits admin + ERM only) | detection/page.tsx:335 vs ground.resolver.ts:619 |
| `g-orgbug` | Org-settings edit controls key off `find(()=>true)` | visibility unreliable for org members; server still enforces | settings/org/page.tsx:240 |
| `g-shown` | Shown-but-server-gated controls 403 gracefully | toast/disabled, no crash | multiple |
| `g-listusers` | Non-admin `listUsers` returns empty, not PII | `{users:[], error}`; no email/phone/role leak | auth.ts:253 |
| `g-cap` | Enrichment daily cap | `DAILY_CAP` → `TOO_MANY_REQUESTS` (`enrichment-cap-reached`) | tasks.ts:218 |
| `g-flags` | Surfaces absent when flags OFF | Inbox/enrichment not rendered | constants/feature-flags.ts |

---

## Appendix — machine-readable test cases (JSON)

Parse this block for deterministic test generation. `expect` maps each applicable persona to
`{ui, server}`; `roles` (team/org matrix) maps each role to a status string
(`allow|block|hidden|disabled|readonly|own|token`). `selectors` are `data-testid` values unless noted.

```json
{
  "schema": "clear-mvp.role-access.v1",
  "statusLegend": {
    "allow": {"ui": "enabled", "server": "200"},
    "block": {"ui": "enabled", "server": "403"},
    "hidden": {"ui": "hidden", "server": "n/a"},
    "disabled": {"ui": "disabled", "server": "n/a"},
    "readonly": {"ui": "read-only", "server": "n/a"},
    "conditional": {"ui": "conditional", "server": "200|403", "note": "depends on record policy"},
    "own": {"ui": "enabled", "server": "200-own"},
    "token": {"ui": "enabled", "server": "public"}
  },
  "personas": ["admin","analyst","member","erm","pending","team_admin","org_admin","team_member"],
  "flags": {
    "hotline_inbox": "OFF", "impact_prior_review": "OFF", "event_enrichment": "OFF",
    "hotline_translation": "OFF", "ground_intel": "ON"
  },
  "cases": [
    {"id":"nav-admin","area":"access","action":"Open /admin + Admin nav link","route":"/admin","selectors":["a[href=\"/admin\"]"],"flags":[],"source":"middleware.ts:100","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"},"onDeny":"redirect /dashboard"},
    {"id":"nav-ops","area":"access","action":"Operations/Cash nav items","route":"*","selectors":["nav:Operations","nav:Cash Assistance"],"flags":[],"source":"nav-sidebar.tsx:116","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"}},
    {"id":"nav-ground","area":"access","action":"Detection Ground Intel tab","route":"/detection?tab=ground","selectors":["tab:Ground Intel"],"flags":["ground_intel"],"source":"detection/page.tsx:335","expect":{"admin":"allow","analyst":"allow","member":"hidden","erm":"hidden","pending":"hidden"},"note":"canSeeGround shows the tab to a team analyst; ground server calls still 403 for analyst (admin + ERM only)"},
    {"id":"nav-content","area":"access","action":"Load content pages","route":"/overview|/detection|/map|/insights","selectors":[],"flags":[],"source":"roles.ts:78","expect":{"admin":"allow","analyst":"allow","member":"allow","erm":"allow","pending":"block"}},
    {"id":"nav-agent","area":"access","action":"AI Agent / /api/agent","route":"*","selectors":["agent-drawer"],"flags":["agent"],"source":"api/agent/route.ts:54","expect":{"admin":"allow","analyst":"allow","member":"allow","erm":"allow","pending":"block"}},

    {"id":"inbox-see","area":"inbox","action":"Reach the Inbox","route":"/inbox","selectors":["inbox-no-access"],"flags":["hotline_inbox","impact_prior_review","event_enrichment"],"source":"inbox-access.ts:51","expect":{"admin":"allow","analyst":"allow","member":"allow","erm":"allow","pending":"hidden"}},
    {"id":"inbox-hotline","area":"inbox","action":"See hotline threads (Reports)","route":"/inbox","selectors":["inbox-filter-reports"],"flags":["hotline_inbox"],"source":"inbox-access.ts:61","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"allow","pending":"hidden"},"note":"ground inbox is admin + ERM only"},
    {"id":"inbox-triage","area":"inbox","action":"Triage: Add to CLEAR / Archive / Reject","route":"/inbox","selectors":["inbox-add","inbox-archive","inbox-reject","inbox-reject-<reason>"],"flags":["hotline_inbox"],"source":"ground.resolver.ts:227","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"allow","pending":"hidden"},"note":"requireGroundInboxAccess admits admin + ERM only; analyst has no hotline surface"},
    {"id":"inbox-retry","area":"inbox","action":"Retry failed pipeline stage","route":"/inbox","selectors":["inbox-retry"],"flags":[],"source":"ground.resolver.ts:1173","expect":{"admin":"allow","analyst":"block","erm":"allow"},"note":"retryGroundMessage → requireGroundInboxAccess (admin + ERM only)"},
    {"id":"inbox-translate","area":"inbox","action":"Translate thread","route":"/inbox","selectors":["inbox-translate","inbox-translate-retry"],"flags":["hotline_translation"],"source":"reading-pane.tsx:230","expect":{"admin":"allow","erm":"allow"}},
    {"id":"inbox-proposals","area":"inbox","action":"See proposed signals + badge","route":"/inbox","selectors":["inbox-filter-proposals"],"flags":["impact_prior_review"],"source":"task.resolver.ts:275","expect":{"admin":"allow","analyst":"allow","member":"hidden","erm":"hidden","pending":"hidden"},"note":"requireCaseProposalInboxAccess: admin (unscoped) + team-analyst (team-scoped); ERM excluded"},
    {"id":"inbox-decide","area":"inbox","action":"Decide proposal Accept/Reject","route":"/inbox","selectors":["case-proposal-accept","case-proposal-reject","case-proposal-confirm-reject"],"flags":["impact_prior_review"],"source":"task.resolver.ts:299","expect":{"admin":"allow","analyst":"allow","member":"readonly","erm":"hidden","pending":"hidden"},"note":"team analyst decides only for the task's own team; ERM no longer decides case proposals"},
    {"id":"inbox-myreq","area":"inbox","action":"My requests + cancel own","route":"/inbox","selectors":["inbox-task-cancel"],"flags":["event_enrichment"],"source":"task.resolver.ts:625","expect":{"admin":"own","analyst":"own","member":"own","erm":"own","pending":"hidden"}},

    {"id":"ev-alert","area":"event","action":"Raise alert / promote","route":"/event/[id]","selectors":["btn:Raise alert"],"flags":[],"source":"alerts.ts:545","expect":{"admin":"allow","analyst":"allow","member":"disabled","erm":"disabled","pending":"block"}},
    {"id":"ev-addcrisis","area":"event","action":"Add event to crisis","route":"/event/[id]","selectors":["Add-to-crisis menu"],"flags":[],"source":"crises.ts:367","expect":{"admin":"allow","analyst":"allow","member":"block","erm":"block","pending":"block"}},
    {"id":"ev-enrich","area":"event","action":"Request enrichment","route":"/event/[id]","selectors":["request-enrichment","enrichment-confirm-button","enrichment-forbidden","enrichment-cap-reached","enrichment-cancel"],"flags":["event_enrichment"],"source":"task.resolver.ts:662","expect":{"admin":"allow","analyst":"allow","member":"disabled","erm":"allow","pending":"block"}},
    {"id":"ev-decide","area":"event","action":"Decide proposal (Event page Enrichment)","route":"/event/[id]","selectors":["enrichment-section case rows"],"flags":["event_enrichment","impact_prior_review"],"source":"enrichment-section.tsx:42","expect":{"admin":"allow","analyst":"allow","member":"readonly","erm":"readonly","pending":"block"},"note":"team analyst decides (their team); ERM is not a decider → read-only, consistent with the Inbox"},
    {"id":"ev-comment","area":"event","action":"Comment + feedback","route":"/event/[id]","selectors":["comment composer","feedback thumbs"],"flags":[],"source":"comments.ts:89","expect":{"admin":"allow","analyst":"allow","member":"allow","erm":"allow","pending":"block"}},

    {"id":"cr-title","area":"crisis","action":"Rename crisis title","route":"/crisis/[id]","selectors":["title pencil"],"flags":[],"source":"crises.ts:467","expect":{"admin":"allow","analyst":"allow","member":"allow","erm":"allow","pending":"block"},"note":"GOTCHA: any authenticated user"},
    {"id":"cr-summary","area":"crisis","action":"Edit summary/population","route":"/crisis/[id]","selectors":["summary pencil"],"flags":[],"source":"crises.ts:482","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"}},
    {"id":"cr-delete","area":"crisis","action":"Delete crisis","route":"/crisis/[id]","selectors":["kebab delete"],"flags":[],"source":"crises.ts:455","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"}},
    {"id":"cr-addev","area":"crisis","action":"Add events to crisis","route":"/crisis/[id]","selectors":["crisis-add-event-<id>"],"flags":[],"source":"add-events-to-crisis-modal.tsx:263","expect":{"admin":"allow","analyst":"allow","member":"hidden","erm":"hidden","pending":"hidden"}},
    {"id":"cr-rmev","area":"crisis","action":"Remove event from crisis","route":"/crisis/[id]","selectors":["event row remove"],"flags":[],"source":"crises.ts:444","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"}},
    {"id":"cr-doc","area":"crisis","action":"Upload/remove crisis document","route":"/crisis/[id]","selectors":["upload btn","doc trash"],"flags":[],"source":"crises.ts:345","expect":{"admin":"allow","analyst":"allow","member":"block","erm":"block","pending":"block"}},

    {"id":"det-signal","area":"detection","action":"Create signal (manual)","route":"/detection","selectors":["Create signal modal"],"flags":[],"source":"signal.resolver.ts:501","expect":{"admin":"allow","analyst":"allow","member":"block","erm":"block","pending":"block"},"note":"team analyst writes via location-scoped gate (wide-open team → succeeds); plain member has no team → 403"},
    {"id":"det-bulk","area":"detection","action":"Bulk Raise alert / Add to crisis","route":"/detection","selectors":["bulk-raise-alert"],"flags":[],"source":"event-bulk-bar.tsx:33","expect":{"admin":"allow","analyst":"allow","member":"hidden","erm":"hidden","pending":"hidden"}},
    {"id":"det-sev","area":"detection","action":"Update signal severity","route":"/inbox|/signal/[id]","selectors":["severity control"],"flags":[],"source":"signal.resolver.ts:600","expect":{"admin":"allow","analyst":"allow","member":"block","erm":"block"},"note":"requireAdminOrTeamAnalystForLocations: location-scoped; wide-open team analyst succeeds"},
    {"id":"det-loc","area":"detection","action":"Update signal location","route":"/signal/[id]","selectors":["location control"],"flags":[],"source":"signal.resolver.ts:671","expect":{"admin":"allow","analyst":"block","member":"block","erm":"block"},"note":"GOTCHA: updateSignalLocation is still admin-only (requireRole['admin']) — NOT location-scoped like severity"},
    {"id":"det-ground","area":"detection","action":"Review ground thread (drawer)","route":"/detection?tab=ground","selectors":["ground-approve-private","ground-approve-public","ground-confirm-publish","ground-reject"],"flags":["ground_intel"],"source":"ground.resolver.ts:619","expect":{"admin":"allow","analyst":"block","member":"hidden","erm":"hidden"},"note":"tab/drawer render for a team analyst but reviewGroundThread → requireGroundInboxAccess (admin + ERM only) → 403"},

    {"id":"an-new","area":"analysis","action":"Create analysis automation","route":"/insights","selectors":["analysis-new"],"flags":["analysis_v2"],"source":"analysis.resolver.ts:453","expect":{"admin":"allow","analyst":"allow","member":"hidden","erm":"hidden","pending":"hidden"},"note":"team analyst on the owning team; null team → admin-only"},
    {"id":"an-manage","area":"analysis","action":"Refresh/cadence/remove analysis","route":"/insights","selectors":["refresh","cadence","remove"],"flags":[],"source":"analysis.resolver.ts:499","expect":{"admin":"allow","analyst":"allow","member":"hidden","erm":"hidden"}},

    {"id":"subs","area":"subscriptions","action":"Manage own alert subscriptions","route":"settings","selectors":["subscription form"],"flags":[],"source":"subscriptions.ts:111","expect":{"admin":"own","analyst":"own","member":"own","erm":"own","pending":"own"}},
    {"id":"bell","area":"notifications","action":"Notification bell + mark read","route":"*","selectors":["notifications bell"],"flags":[],"source":"notifications.ts:53","expect":{"admin":"own","analyst":"own","member":"own","erm":"own","pending":"hidden"}},

    {"id":"adm-approve","area":"admin","action":"Approve pending user","route":"/admin","selectors":["activate btn"],"flags":[],"source":"auth.ts:306","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"}},
    {"id":"adm-role","area":"admin","action":"Change user global role","route":"/admin","selectors":["role dropdown"],"flags":[],"source":"auth.ts:292","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"},"note":"pending rows' dropdown disabled — approve first"},
    {"id":"adm-flag","area":"admin","action":"Toggle feature flag","route":"/admin","selectors":["feature Switch"],"flags":[],"source":"featureFlags.ts:55","expect":{"admin":"allow","analyst":"block","member":"block","erm":"block","pending":"block"},"note":"hard local FORBIDDEN; tier-1 flags locked for all"},
    {"id":"adm-users","area":"admin","action":"View user list with PII","route":"/admin","selectors":["users table"],"flags":[],"source":"auth.ts:253","expect":{"admin":"allow","analyst":"hidden","member":"hidden","erm":"hidden","pending":"hidden"},"note":"non-admin gets empty list, not hard error"}
  ],
  "roleCases": [
    {"id":"to-createorg","action":"Create an organisation","route":"/settings/org|/admin","source":"trpc.ts:103; teams.ts:227","roles":{"org_admin":"block","team_admin":"block","team_member":"block"},"note":"platform admin only"},
    {"id":"to-orgmembers","action":"Edit org / add-remove org member / change role","route":"/settings/org","source":"settings/org/page.tsx:239","roles":{"org_admin":"allow","team_admin":"block","team_member":"block"},"note":"org page member-match bug: trust server"},
    {"id":"to-createteam","action":"Create / delete a team","route":"/settings/org","source":"teams.ts:300","roles":{"org_admin":"allow","team_admin":"block","team_member":"block"}},
    {"id":"to-teammanage","action":"Edit team / add-remove members / set locations","route":"/settings/team/[id]","source":"settings/team/[id]/page.tsx:93","roles":{"org_admin":"allow","team_admin":"allow","team_member":"hidden"}},
    {"id":"to-mintERM","action":"Assign emergency_response_manager","route":"/settings/team/[id]|org invite","source":"team/[id]/page.tsx:376; org/page.tsx:627","roles":{"org_admin":"allow","team_admin":"allow","team_member":"hidden"}},
    {"id":"to-deleteteam","action":"Delete a team (Danger Zone)","route":"/settings/team/[id]","source":"team/[id]/page.tsx:384","roles":{"org_admin":"allow","team_admin":"hidden","team_member":"hidden"}},
    {"id":"to-invite","action":"Invite member (org role + >=1 team role)","route":"/settings/org","source":"invitations.ts:146","roles":{"org_admin":"allow","team_admin":"block","team_member":"block"}},
    {"id":"to-write","action":"Create signal/event/crisis/enrichment via teamId hint","route":"/detection|/event/[id]","source":"auth-guard.ts:39 (TEAM_CONTENT_WRITER_ROLES); signals.ts:353; events.ts:366; crises.ts:331","roles":{"org_admin":"block","team_admin":"allow","team_member":"allow"},"note":"TEAM_CONTENT_WRITER_ROLES now includes team_member; org_admin has no team membership → block"}
  ],
  "sharedFlows": [
    {"id":"sh-login","action":"Sign in (valid creds)","route":"/auth/login","server":"public","source":"auth/login/page.tsx:78"},
    {"id":"sh-accept","action":"Accept invite (name + password >=8)","route":"/accept-invite","server":"public","source":"invitations.ts:177"},
    {"id":"sh-verify","action":"Verify email","route":"/verify-email/[token]","server":"public","source":"auth.ts:188"},
    {"id":"sh-reset","action":"Request + complete password reset","route":"/auth/forgot-password|/auth/reset-password","server":"public","source":"invitations.ts:218"},
    {"id":"sh-noaccess","action":"No org + no team -> /no-access","route":"/no-access","server":"n/a","source":"onboarding-guard.tsx:27"},
    {"id":"sh-pending","action":"Pending refused content until approved","route":"*","server":"403","source":"roles.ts:78"}
  ],
  "gotchas": [
    {"id":"g-title","check":"Member renames crisis title but cannot edit summary","source":"crises.ts:467 vs :482"},
    {"id":"g-loc","check":"Team analyst sets severity (location-scoped) but NOT location (updateSignalLocation still admin-only)","source":"signal.resolver.ts:600 vs :671"},
    {"id":"g-ground","check":"Detection Ground tab renders for a team analyst (canSeeGround) but every ground call 403s (requireGroundInboxAccess admits admin + ERM only)","source":"detection/page.tsx:335 vs ground.resolver.ts:619"},
    {"id":"g-orgbug","check":"Org-settings edit controls use find(()=>true)","source":"settings/org/page.tsx:240"},
    {"id":"g-shown","check":"Shown-but-server-gated controls 403 gracefully","source":"multiple"},
    {"id":"g-listusers","check":"Non-admin listUsers returns empty, no PII","source":"auth.ts:253"},
    {"id":"g-cap","check":"Enrichment DAILY_CAP -> TOO_MANY_REQUESTS","source":"tasks.ts:218"},
    {"id":"g-flags","check":"Surfaces absent when flags OFF","source":"constants/feature-flags.ts"}
  ]
}
```

---

_Fidelity note: clear‑mvp hides dead UI; **clear‑api** is the authoritative gate and the explorers could
not read it directly. Treat `403` rows as the **expected server behaviour to confirm**, and verify selectors/
`data-testid`s against the running build before relying on them in automation._
