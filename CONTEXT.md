# CLEAR

CLEAR (Crisis Learning, Early-warning, Anticipation, and Response) is a humanitarian
decision-support platform for the Norwegian Refugee Council. This Next.js app is a BFF
that proxies to backend services; it owns no domain data of its own.

## Language

### Agent

**Agent**:
The `/agent` page — a chat surface where a user asks the **NRC Find** knowledge base a
question and reads a streamed **Answer** with its **Source documents**.
_Avoid_: "the bot", "assistant" (in CLEAR, "Agent" is the page/feature, not a persona).

**NRC Find**:
NRC's external Retrieval-Augmented-Generation knowledge base, reached via
`POST /api/v1/rag/answers`. It is **stateless**: each call takes one `prompt` and returns
one Answer plus Source documents, with no memory of prior calls.
_Avoid_: "the LLM", "the model" (NRC Find is the retrieval service, not a raw model).

**Answer**:
The generated response to a single question, streamed token-by-token over NDJSON.

**Source document**:
A knowledge-base passage NRC Find cited for an Answer (title + excerpt). Belongs to the
one Answer it was returned with.
_Avoid_: "citation", "reference", "result".

**Thread**:
The on-screen sequence of question/Answer turns for one conversation. A **UI-only**
construct — turns are *not* sent back to NRC Find, so each question is answered
independently (see [ADR-0001](docs/adr/0001-agent-is-a-stateless-rag-thread.md)).
_Avoid_: "conversation history" (implies the backend remembers — it does not).

### Detection hierarchy

**Signal**:
A raw observation from a source (Dataminr, ACLED, partner/manual entry, and similar).
_Avoid_: "alert" for raw feed items; "event" for an unclustered observation.

**Event**:
A clustered/classified incident composed of one or more **Signals**.
_Avoid_: treating Event as synonymous with Alert; calling every map pin an Event.

**Alert**:
An **Event** (or set of Events) raised into the attention lifecycle
(`draft` | `published` | `archived`) — what analysts act on first.
_Avoid_: using Alert for any raw Signal; "notification" (product push/tagging is separate).

### Location trust

**Location challenge**:
An analyst marks a **Signal** pin as untrusted (“this looks wrong”) without the system
forcing alternate candidates. A challenge **does not require** a proposed fix. First
wedge: **Signals only** — parent **Event** / **Alert** may show that a child Signal has
an open challenge, but corrections do not attach to Event/Alert pins yet. **v1 entry:**
Signal detail page **and** Signal **Marker detail panel** (same action, two doors).
_Avoid_: “top‑3 locations” as a required step; requiring a correction to file a
challenge; challenging Event/Alert pins as the v1 model; map-only or detail-only entry.

**Location correction**:
An optional proposed new **point** (lat/lng) for a challenged **Signal**, submitted for
**consideration**. Place name / note may accompany it but are not required. Not applied
as sole truth until accepted (accept/reject is post‑v1).
_Avoid_: treating submit as immediate overwrite; requiring a gazetteer name pick;
treating correction as mandatory whenever a challenge exists.

**Dual location display**:
Only when a **Location correction** (proposed point) exists: the map shows **both** the
source pin and the proposed pin (e.g. solid vs ghost) while queued. A bare **Location
challenge** (no correction) keeps the source pin with a challenged affordance — no
second pin.
_Avoid_: hiding the Signal until resolved; silently replacing the source pin; showing
a ghost pin when no correction was submitted.

**Consideration**:
The review state for a **Location correction** before it becomes trusted geography.
**v1:** corrections are queued only — no in-product accept/reject UI yet. **End-state:**
a **Location admin** (gazetteer / naming reviewer — the “data admin group”) performs
consideration; not the same as platform `admin` or Alert lifecycle.
_Avoid_: shipping accept/reject in the first Location-trust wedge; conflating with
**Alert** draft/published/archived; calling every org admin a Location admin.

**Location admin**:
The future reviewer role for locality naming and **Location correction** consideration.
_Avoid_: reusing platform `admin` as the gazetteer role by default.

### Invited-user onboarding

**Welcome**:
The post-invite setup path — `/welcome/profile` then `/welcome/settings` — before the
user enters the product. Completing Welcome does **not** complete onboarding; the
**Product Tour** still runs. **Forced only for fresh invites** (post `/accept-invite`).
Existing users are never redirected into Welcome/Tour; they may opt in via Profile
“Show tour again”.
_Avoid_: calling Welcome "onboarding" alone (onboarding = Welcome + Product Tour);
conflating with the legacy `/onboarding` org/team/locations flow (to be retired);
re-trapping veterans because localStorage lacks timestamps.

**Product Tour**:
A short, guided walkthrough (driver.js) that teaches the detection hierarchy and lands
the user on the map. **Teaching order (analyst urgency):** **Alert → Event**, with
**Signal** mentioned in Event copy as source material — not a first-class tour stop in
this merge. **Stop list (this merge, 4 stops):** (1) Detection → **Alerts** tab,
(2) Detection → **Events** tab, (3) Map → **Layers**, (4) Map → **canvas** (Finish).
**Map Layers tour stop**:
Teaches the **live** Layers surface only — data view, basemap (Streets / Satellite),
Roads, boundaries, and other controls that already work. Does **not** pitch
Coming-soon rows (IDP Density, Blockages, NRC locations) or future topography work.
_Avoid_: north-star teases in tour copy; implying stub toggles are usable.

**Out of scope for this merge:** Signals-as-a-stop; Insights stops; Map filters stop;
full layer curriculum / live NRC·IDP·Blockages; server-persisted tour timestamps
(localStorage until Expo #32).
_Avoid_: "map tour" as the product name (the tour starts on Detection); teaching
Signal → Event → Alert as the tour path (that's the data pipeline, not the tour);
an 8-stop Detection → Insights → Map hop as the minimal ship.

### Detection detail navigation

**Quick Navigation**:
Prev/next controls on Signal and Event detail pages that move through the Detection list
order (including active filter/sort context) without remounting the page shell.
_Avoid_: full-page navigation flash; treating Quick Navigation as a browser history stack
of unrelated entities.

**Navigation Transition**:
The loading behavior during Quick Navigation: stable chrome (back, arrows, position); data
slots show skeletons while the target entity is pending; resolved content **replaces**
skeleton with an instant swap (no fade-from-transparent).
_Avoid_: white overlays; page-level content fade-in; opacity-0 entry animations on resolve.

### Map foundation

**Basemap triad**:
Exactly one basemap is active: **Simple**, **Topography** (relief/hillshade), or
**Satellite**. Not a Satellite checkbox stacked on Simple.
_Avoid_: peer-checkbox Satellite; treating Topography as an overlay instead of a basemap
choice; shipping operational layers before the triad is correct.

**NRC locations** (layer):
Operational map layer of NRC sites/offices — next operational layer to wire after the
**Basemap triad** is fixed. Lives under **Operational** with Blockages (Blockages still
later).
_Avoid_: bundling IDP Density + Blockages + NRC as one must-ship; custom layers (#76)
before NRC for this stack.

**Spaghetti connector**:
A visual link (e.g. dashed line) between a map marker and its open **Marker detail
panel** so the eye can trace which panel belongs to which pin when several are open.
Ships in one PR with **Copyable coordinates**.
_Avoid_: calling spiderfy “spaghetti” (spiderfy separates coincident pins; spaghetti
ties pin↔panel); splitting click-to-copy lat/lng into a separate milestone.

**Mobile fullscreen map**:
Map chrome that expands the map from bottom-to-top on small viewports so the canvas
is the primary surface.
_Avoid_: desktop Keep-panels-open behavior on mobile; treating this as a Layers feature.

**Copyable coordinates**:
Lat/lng shown in the **Marker detail panel** (and equivalent detail chrome) that copy
to the clipboard on click/tap, with simple clear feedback (e.g. brief “Copied”).
_Avoid_: forcing a context menu or selecting raw text; silent copy with no feedback.

**API docs find (Cmd-K / Cmd-F)**:
Fix for table-of-contents and in-page search in **API documentation** — not a CLEAR
product global command palette.
_Avoid_: booking this as in-app Cmd-K search; conflating with Detection/Map filters.

### Foresight

**Foresight**:
The anticipate-not-only-verify product area (weather/forecast, conflict probability,
notifications/tagging, and related). **Not ticketed as builds yet** — needs a spike/PRD
after **NRC locations**. Likely first build when spiked: **weather / forecast layer**
(map-aligned). Conflict probability and notifications are separate products under the
same umbrella until defined.
_Avoid_: minting a cluster of Foresight Expo tickets from notes alone; treating
notifications as the first Foresight ship by default.

### Map marker panels

**Keep panels open**:
A map Layers toggle in its own **Panels** section (between Boundaries & Markers and Base
map). When **off** (default), clicking a marker **replaces** the open marker detail panel.
When **on**, each marker click **adds** another panel so several can sit on the map at once
for side-by-side inspection. Changing the map **data view** (alert / event / signal /
crisis) **clears** all open panels — panels are not kept across views. Turning the toggle
**off** does not dismiss panels already open; it only restores replace-on-click for
subsequent clicks. Analysts close panels with ✕. Clicking a marker that already has a panel
**focuses** that panel (bring to front + pin pulse) instead of opening a duplicate. At most
**four** panels: opening a fifth closes the oldest (FIFO). **Desktop only** — on mobile the
control is hidden and marker clicks always use a single bottom sheet. Shipped on the **`/map`**
route only for this slice (dashboard map stays single-panel).
_Avoid_: "window persistence", "compare mode" (unless we later scope explicit cross-view
comparison), "pin" (reserved if we add per-panel pinning later), orphan panels that
outlive their data view; do not nest this control under Base map (cartography only);
stacking bottom sheets on mobile.

**Marker detail panel**:
The floating card that shows a map marker's summary and View details CTA. Draggable on
desktop; bottom sheet on mobile.
_Avoid_: "popup", "window", "modal" (it is not modal — the map stays interactive).

## Relationships

- A **Thread** contains many question/**Answer** turns
- An **Answer** has zero or more **Source documents**
- Each turn is one independent **NRC Find** call; the **Thread** gives it no prior context
- One or more **Signals** compose an **Event**
- An **Event** may be raised into one or more **Alerts** (non-empty `event.alerts` =
  flagged as an alert)
- A **Location challenge** may stand alone or be followed by an optional **Location
  correction** (proposed point) queued for **consideration** (accept/reject by
  **Location admin** later; v1 queues only)
- **Dual location display** applies only when a **Location correction** point exists
- **Welcome** precedes the **Product Tour**; both must complete before onboarding is done
- The **Product Tour** (this cycle) is four stops: Alerts → Events → Map Layers → Map
  canvas (Finish); it does not visit Insights, Map filters, or Signals-as-a-stop
- With **Keep panels open** off, the map shows at most one **Marker detail panel**; with it
  on, the map may show up to four (same data view only — view change clears panels). The
  **Keep panels open** control lives in the Layers **Panels** section. After the
  **Product Tour** merges, a **Spaghetti connector** visually joins each open panel to
  its marker.
- **Copyable coordinates** live on the **Marker detail panel** (click/tap to copy)

## Example dialogue

> **Dev:** "If the user asks a follow-up like 'tell me more', does the **Agent** send the
> previous **Answer** so **NRC Find** has context?"
> **Domain expert:** "No — **NRC Find** is stateless. The **Thread** is just what the user
> sees; every question is a fresh retrieval. A vague follow-up will retrieve against those
> words alone."

> **Dev:** "Quick Navigation works but content flashes when it loads — keep a fade-in?"
> **Domain expert:** "No. Instant swap: skeletons → content. Chrome never blinks; no
> fade-from-transparent."

> **Dev:** "Should clicking another marker always replace the open **Marker detail panel**?"
> **Domain expert:** "Only when **Keep panels open** is off. When it's on, new clicks add
> panels so analysts can compare several markers on the map."

> **Dev:** "User opens an Event panel, switches data view to Signal — keep the Event panel?"
> **Domain expert:** "No. Data view change clears all **Marker detail panels**. Compare within
> one view for now."

> **Dev:** "They turn **Keep panels open** off with three panels still on screen — close them?"
> **Domain expert:** "No. Leave them; only the next click goes back to replace behavior.
> Close is always ✕ (or a data-view change)."

> **Dev:** "Same marker clicked twice with **Keep panels open** on — second card?"
> **Domain expert:** "No. Focus the existing **Marker detail panel** and pulse its pin."

> **Dev:** "How many panels before we stop?"
> **Domain expert:** "Four. A fifth opens by dropping the oldest (FIFO)."

> **Dev:** "Put **Keep panels open** under Base map with roads/satellite?"
> **Domain expert:** "No. Own **Panels** section — Base map stays cartography only."

> **Dev:** "Four bottom sheets on a phone?"
> **Domain expert:** "No. **Keep panels open** is desktop-only; mobile stays one sheet."

> **Dev:** "Dashboard map too?"
> **Domain expert:** "Not this slice — **`/map` only**."

> **Dev:** "Should the **Product Tour** walk Signal → Event → Alert like the pipeline?"
> **Domain expert:** "No. Tour order is urgency: **Alert** first (act on this), then
> **Event** (what happened — built from **Signals**). Don't spotlight Signals alone yet."

> **Dev:** "Four map stops after Detection — filters, layers, legend, canvas?"
> **Domain expert:** "No. After Events: **Layers**, then **canvas** Finish. Filters and
> the rest wait."

> **Dev:** "On the Layers stop, mention NRC locations and IDP as coming soon?"
> **Domain expert:** "No. Teach what's live. Don't pitch Coming-soon rows in the tour."

> **Dev:** "User cleared site data — force Welcome + Tour again?"
> **Domain expert:** "No. Only fresh invites are forced. Veterans use Profile replay if
> they want the tour."

> **Dev:** "Finish the tour — send them to Dashboard?"
> **Domain expert:** "No. Stay on **Map** (Finish and Skip)."

> **Dev:** "For bad Dataminr pins, show the top 3 gazetteer matches and force a pick?"
> **Domain expert:** "No. Let the analyst **challenge** the pin and submit a **Location
> correction** for **consideration**. Don't enforce system candidates."

> **Dev:** "Can they challenge an Event pin on the map?"
> **Domain expert:** "Not in v1. **Location challenge** attaches to the **Signal**.
> Event/Alert can show that a child Signal is challenged."

> **Dev:** "While a correction is pending, keep only the source pin with a badge?"
> **Domain expert:** "No. **Dual location display** — source and proposed pins both
> visible while the correction is queued."

> **Dev:** "Ship accept/reject for corrections next week with team admin?"
> **Domain expert:** "No. v1 queues the **Location correction** only. **Location admin**
> consideration comes later."

> **Dev:** "Must every challenge include a moved pin and a corrected name?"
> **Domain expert:** "No. Challenge alone is enough. If they submit a correction, the
> new **point** is required; name/note optional. Dual pins only when a point was proposed."

> **Dev:** "Challenge only from the map panel?"
> **Domain expert:** "No. Same action on **Signal detail** and the Signal **Marker detail
> panel**."

> **Dev:** "Add signal approval status alongside location challenge next week?"
> **Domain expert:** "No. Defer. Don't overlap **Alert** status or **Consideration**."

> **Dev:** "Ship NRC, IDP, and Blockages right after Location trust?"
> **Domain expert:** "No. Fix the **Basemap triad** (Simple / Topography / Satellite),
> then wire **NRC locations**. IDP and Blockages wait."

> **Dev:** "Open Expo tickets for weather, conflict probability, and notifications now?"
> **Domain expert:** "No. One **Foresight** spike after NRC. Bias the spike to weather /
> forecast layer; don't pre-build the rest from notes."

> **Dev:** "Cmd-K / Cmd-F — ship a product command palette?"
> **Domain expert:** "No. That's **API docs find** (TOC/search). Separate from CLEAR UI."

> **Dev:** "Lat/lng in the marker panel — select text to copy?"
> **Domain expert:** "No. Click/tap **Copyable coordinates** with clear Copied feedback."

> **Dev:** "Ship Spaghetti before the onboarding tour merge?"
> **Domain expert:** "No. **Product Tour** #127 first, then **Spaghetti**."

> **Dev:** "Separate ticket for click-to-copy lat/lng?"
> **Domain expert:** "No. Same PR as **Spaghetti connector**."

> **Dev:** "Ticket 'views WS' from the notes?"
> **Domain expert:** "No. Drop for board hygiene unless someone can define it."

> **Dev:** "Roads and Satellite as peer checkboxes under Base map?"
> **Domain expert:** "No. **Satellite** is a basemap (Streets ↔ Satellite). **Roads** is an
> overlay that works on either basemap. Separate sections."

> **Dev:** "Ship Blockages / IDP / NRC locations toggles now?"
> **Domain expert:** "Stub them disabled with Coming soon — don't fake live layers.
> **IDP Density** sits under **Population**; **Blockages** / **NRC locations** under
> **Operational**. Wire performant aggregations in a later slice."

> **Dev:** "Four ways back to the map from a detail page — keep View on Crisis Map?"
> **Domain expert:** "No. Drop the header **View on Crisis Map**. **Back** (when
> `from=map`) and **Full Map** deep-link to the marker. Sidebar **Map** tab stays the
> default overview. See issue #108."

## Flagged ambiguities

- Next-cycle priority stack (notes grill) — resolved: (1) reshape/merge **Product Tour**
  #127; (2) **Spaghetti connector** + **Copyable coordinates** (one PR); (3) **Mobile
  fullscreen map**; then **Location trust** v1; **Basemap triad**; **NRC locations**;
  **Foresight** spike. **API docs find** parallel anytime. Every ticket assumes manual
  QA / review before done.
- Spaghetti vs tour — resolved: **#127 first**, then **Spaghetti** (not parallel, not
  Spaghetti-first).
- **Copyable coordinates** — resolved: ship in the **same PR as Spaghetti** (Marker
  detail panel).
- Map foundation order — resolved: **Basemap triad** first, then **NRC locations**;
  not all Coming-soon ops in one ship.
- **Foresight** — resolved for board hygiene: bucket + spike after NRC; likely first
  build = weather/forecast layer. Conflict probability / notifications not first-class
  tickets until spiked.
- Leftover notes — resolved in part: Cmd-K/F = **API docs find**, not app palette;
  **Copyable coordinates** ships with Spaghetti; “views WS” dropped for board purposes;
  map drawing / Insights multi-select / Agent point deep-link remain icebox unless
  reopened. Priority stack frozen for Expo reshape.
- Location trust first wedge — resolved (see [ADR-0003](docs/adr/0003-location-trust-challenge-without-candidates.md)): **Location challenge** + submit **Location
  correction** for **consideration**. Explicitly **not** system-enforced candidate
  locations / top‑3 picker. Alias engine, gazetteer admin, Dataminr ingest fix are
  later or parallel — not this wedge’s UX.
- Location challenge target — resolved: **Signals only** for v1; parents may surface
  “child location challenged” but do not own the correction.
- Pending correction on the map — resolved: **Dual location display** (source +
  proposed) only when a correction point is queued; bare challenge = source pin +
  challenged state. Accept/reject UI is not in v1.
- Consideration reviewer — resolved for sequencing: **v1 = queue only**;
  end-state reviewer = **Location admin**. Not peer-accept or platform-admin-only
  as the target model.
- Challenge vs correction payload — resolved: challenge **without** correction allowed;
  when a correction is submitted, **point required**, name/note optional. No mandatory
  evidence; no forced gazetteer candidates.
- Location challenge entry — resolved: **Signal detail + Signal Marker detail panel**
  (same action).
- “Approval state for new signals” — deferred: do **not** invent a signal-approval
  state machine in the Location-trust wedge; revisit only if it can be defined without
  overlapping **Alert** lifecycle or **Consideration**.
- **Product Tour** shape for merge — resolved: Detection literacy + Map finish (not
  map-only, not 8-stop Detection → Insights → Map).
- Signal / Event / Alert teaching order — resolved: urgency **Alert → Event**; Signal
  only in Event copy this merge.
- **Product Tour** stop list — resolved: Alerts → Events → Map Layers → Map canvas
  (Finish). Map filters / Insights / Signals stops deferred.
- Map Layers tour copy — resolved: **honest current surface** only; no Coming-soon /
  north-star teases (NRC, IDP, Blockages, future topo).
- Who is forced through Welcome + **Product Tour** — resolved: **fresh invites only**;
  existing users opt in via Profile replay; Finish/Skip lands on **Map**.
- Merge blocker for this slice — resolved: reshape and stabilize **PR #127** only;
  Expo #32 (server timestamps) and #40 (retire legacy onboarding) stay follow-ups;
  Location trust / map layers / Foresight do not block the tour merge.
- "alert" vs raw feed — resolved: **Alert** is the attention lifecycle object; raw
  observations are **Signals**.
- "conversation" was used to mean both the visible **Thread** and remembered backend
  history — resolved: only the UI **Thread** exists; there is no server-side history.
- Quick Navigation post-load flash — resolved: instant skeleton→content swap; no resolve
  fade-in.
- "window persistence" / "compare mode" — resolved: the Layers control is **Keep panels
  open** (toggle A); naming of deeper compare features left open.
- Cross–data-view panels — resolved for this slice: **clear all panels** when the data
  view changes (no orphan Event panels on the Signal map). True event-vs-signal compare
  needs a later multi-view markers decision.
- Panel count — resolved: soft max **4**, FIFO eviction.
- Layers placement — resolved: own **Panels** section; not under Base map.
- Mobile — resolved: **Keep panels open** desktop-only; single bottom sheet on mobile.
- Surface — resolved: **`/map` only** for this slice.
- Basemap vs overlay — resolved: exclusive **Basemap triad** **Simple | Topography |
  Satellite**; **Roads** under Overlays (works on the non-imagery path; satellite-streets
  when roads + satellite). Legacy “Streets ↔ Satellite” wording means Simple vs Satellite
  within the triad.
- Operational / population stubs — resolved for this slice: **IDP Density** under
  **Population**; **Blockages** / **NRC locations** under **Operational**; live
  aggregations later.
- Detail→map returns — resolved: remove header **View on Crisis Map**; focused
  **Back** / **Full Map** vs default **Map** tab (#108).

## Theming language

**Theme token** (adaptive token):
A `--color-*` CSS variable defined in [globals.css](src/styles/globals.css) and **redefined**
under `[data-mantine-color-scheme="dark"]`. Any consumer adapts to light/dark automatically.
The tokens are the source of truth for color.
_Avoid_: "CSS variable" generically (config vars exist too) — say "theme token" for color.

**Neutral chrome**:
Structural, non-meaning color — text, borders, backgrounds, surfaces, labels. MUST come from a
**theme token**. A hardcoded chrome hex is the dark-mode bug (black label on a dark card).
_Avoid_: "background colour" used loosely — distinguish chrome from **semantic color**.

**Semantic color**:
A color that *encodes meaning* — critical, warning, success, info, ai, and the accent/brand
orange. Comes from a semantic token (`--color-critical`, `--color-accent`, …) that is itself
dark-tuned, so the **meaning** is constant across themes while the **hex** may differ
(`#DC2626` light → `#F87171` dark).
_Avoid_: treating semantic color as "wrong in dark mode" — red still means critical on both.

**Fixed color**:
A literal hex intentionally identical in both themes AND with no semantic token (region codes,
chart series). Allowed, but lives in one named palette module — never scattered as inline
literals.
_Avoid_: adding a new fixed color inline; it belongs in the palette.

**Color-scheme bridge** (`useIsDark`):
The [hook](src/hooks/use-is-dark.ts) that exposes the active scheme to imperative/canvas
contexts (Mapbox, WebGL, Chart.js) that CSS variables can't reach. The **only** sanctioned
place to branch on theme in JavaScript.
_Avoid_: reading `data-mantine-color-scheme` ad hoc — go through the bridge.

**Pre-login page**:
Any route reachable without a session — accept-invite, login, signup, forgot/reset password,
verify-email. Has **no color-scheme toggle**, so it must render correctly in whatever scheme
the OS resolves under `defaultColorScheme="auto"` (see
[ADR-0002](docs/adr/0002-colors-come-from-theme-tokens.md)).
_Avoid_: "auth page" alone — the defining trait is *no toggle available*, not authentication.

### Color rules

- **Neutral chrome** → theme token. **Semantic color** → semantic token. **Fixed color** →
  palette module. **Canvas color** → branch via the color-scheme bridge.
- A hex literal in a `style` / `styles` / `c` / `bg` / `color` prop is a defect unless it is in
  the palette module or a bridged canvas context.
