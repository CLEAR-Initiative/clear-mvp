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

### App surfaces

**Overview**:
The `/dashboard` surface — a **hybrid operational briefing** for analysts: a thin
situation strip (risk/context), always-visible **Overview quick stats** (country pulse /
Indicators), a small **interactive globe** for geographic orientation, and a small **live
queue** of actionable situations. The queue uses an **attention lens**: ranked by what
needs the analyst now (new / severity jumps / escalating / drafts). Each **situation** is
one event with its linked alerts/signals (not a multi-event cluster) — not Detection’s
chronological feed and not Map’s full spatial canvas.
On **mobile**, the same briefing is the full scrollable page. It is **not** a full Map
replacement and **not** the full Detection feed.
_Avoid_: "dashboard" as the product name (route may stay `/dashboard`; the feature is
**Overview**); treating Overview as a second Map (`CrisisMap` / flat Detection-style map)
or a second Detection; Create Signal as Overview primary CTA; brochure-only NRC/global-ops
blocks with no path into live work; time-sorted dump of hundreds of rows; burying
Indicators inside Detection.

**Overview globe**:
A small interactive 3D globe on Overview (**desktop**) for world/country orientation and
situation pins — not a flat Mapbox map and not a substitute for `/map`. Linked to the
attention queue (place select filters the queue; hover highlights). Pin click → smart
detail; explicit handoff opens `/map` focused. **Hidden on mobile** — mobile uses country
selector + queue only. Implementation preference: **lightweight 3D** (fast load, low CPU/GPU),
prefer **no new dependencies** (Canvas/WebGL with existing stack) over cobe/three/globe.gl.
_Avoid_: embedding the full Map experience; Detection-style flat map as the Overview
spatial chrome; globe-only navigation with no queue; forcing the globe on small screens;
heavy Three.js globe stacks for this surface.

**Situation** (Overview queue unit):
One **event** with its nested alerts and signals. Not several events rolled into one
row, and not an orphan signal. Same entity analysts open in Detection/Event detail;
Overview only ranks and caps which ones surface first.
_Avoid_: treating “situation” as a new backend entity; multi-event clusters; conflating
with **Situation Analysis** (AI/report enrichment) or ReliefWeb sitreps.

**Overview attention queue**:
The live, ranked list on Overview of **situations** that need attention. Ranked by
**severity × freshness**, with boosts for draft/escalating / new-since-last-visit
(per-browser last-seen on Overview, falling back to last 24h). Soft cap **~8**, scoped
to the selected country or globe filter — never a world dump. Orphan signals without an
event stay in Detection — not on Overview.
_Avoid_: calling this the Detection feed; infinite scroll of the full corpus; mixed
orphan-signal rows competing with situations; unpublished-only inbox; requiring
server-side last-visit for v1.

**Overview quick stats** (Indicators):
Country pulse at the **top** of Overview: event/alert activity trend, analysis coverage,
IDP displacement, and INFORM Severity — scoped to Selected Context. Not Detection chrome.
_Avoid_: hiding Indicators behind a Detection accordion; treating quick stats as a second Map.

**Overview context** (Selected Context):
Country selector, compact INFORM risk, and **Active situations** chips (escalating /
drafts → Detection). On **desktop** this sits **below** the Operational Globe in the
right rail; on **mobile** above the Attention Queue.
_Avoid_: promoting NRC Global Ops / demo Response Status as primary Overview content.

**Map**:
The `/map` surface — full interactive crisis/signal spatial exploration.
_Avoid_: embedding a full Map experience inside Overview.

**Detection**:
The feed of signals and events analysts browse and open for detail — workspace for triage
and drill-down, not the home for country Indicators / INFORM Severity pulse.
_Avoid_: "inbox", "timeline" for this surface; re-adding Overview Indicators as Detection
header chrome.

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
route only (**Overview** has no map pane).
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
- With **Keep panels open** off, the map shows at most one **Marker detail panel**; with it
  on, the map may show up to four (same data view only — view change clears panels). The
  **Keep panels open** control lives in the Layers **Panels** section.
- **Overview** points analysts to **Detection** and **Map**; it does not duplicate **Map**
  or the full Detection feed — its live queue uses a distinct lens; country **Indicators**
  live in **Overview quick stats**; spatial orientation uses the **Overview globe**, not a
  second CrisisMap

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
- Basemap vs overlay — resolved: **Streets | Satellite** exclusive basemap; **Roads**
  under Overlays.
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
