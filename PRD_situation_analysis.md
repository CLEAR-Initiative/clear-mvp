# Situation Analysis — Product Requirements Document

---

## 🎯 Problem / Outcome

Humanitarian coordinators at NRC spend significant time manually synthesising situation reports, sector assessments, and operational data from multiple sources before they can form a coherent picture of an active crisis. This creates delays in decision-making, inconsistent analysis quality across teams, and duplicated effort when multiple staff members prepare similar briefings independently.

The Situation Analysis feature gives coordinators a single structured view of any active crisis — combining key figures, sector severity ratings, active crises and events, and an AI-generated narrative summary — so that they can orient quickly, brief others accurately, and identify the most acute needs without manual data aggregation.

---

## 👤 User Story

As a **humanitarian programme coordinator**, I want to **access a live, structured situation analysis for any active crisis at a glance**, so that **I can brief colleagues, prioritise response, and make decisions faster without manually aggregating data from multiple sources**.

---

## User Flow

1. User navigates to the **Analysis** page from the sidebar.
2. User selects a **crisis / country** from the dropdown in the page header (e.g. Sudan Crisis 2026).
3. The page loads with the **Overview tab** active, showing:
   - Key figures (IDPs, people in need)
   - A placeholder for the AI-generated summary with a **Generate Summary** button
   - Current hazards and threats
   - Context and output risks
   - Displacement push factors and intentions
4. User clicks **Generate Summary**; a 4–5 sentence AI narrative is written into the summary card.
5. User switches to the **Sectors tab**:
   - Views a sector matrix showing severity (Critical / Severe / Serious / Moderate) across three pillars: Impact, Humanitarian Conditions, At Risk.
   - Clicks a sector row to open the detail panel, which shows top risks, sectoral needs, priority interventions, and information coverage score with identified gaps.
6. User switches to the **Crises tab**:
   - Sees a list of active crises associated with the selected country, sorted by most recent activity.
   - Below, sees a filterable, paginated list of events (severity badge, location, type, time, signal count), using the same component as the Detection page.
   - Uses the filter popover to narrow by severity, event type, or source.
   - Clicks **Load more** to see additional events (5 at a time).
   - Clicks an event row to navigate to the full event detail page.
7. User switches to the **Sources tab**:
   - Reviews the key data sources underpinning the analysis, with organisation name, type (UN agency, INGO, government), description, and link.
8. User clicks **Export** to print / save the page as a PDF for a briefing.

---

## ✅ Requirements

### General
- [ ] Country / crisis selector in the page header; switching country resets the AI summary and all tabs.
- [ ] **Export** button triggers `window.print()` for PDF generation.
- [ ] Page is protected — requires authenticated session.

### Overview Tab
- [ ] Display key figures (e.g. 11M IDPs, 25M people in need) as prominent number cards.
- [ ] **Generate Summary** button calls the LLM endpoint with country data context and renders the response as a narrative paragraph.
- [ ] Show a spinner and disable the button while the LLM request is in flight.
- [ ] Display current hazards and threats as a bulleted list.
- [ ] Display context / output risks grouped by category (Political, Economy, Security, etc.).
- [ ] Display displacement push factors and stated intentions as two side-by-side lists.

### Sectors Tab
- [ ] Left panel: sector matrix listing all sectors with severity pills for each pillar (Impact / Humanitarian Conditions / At Risk).
- [ ] Severity labels show abbreviated text on screens < 1400 px and full text (Critical / Severe / Serious / Moderate) on screens ≥ 1400 px.
- [ ] Clicking a sector row opens a detail panel on the right with: top risks per pillar, sectoral needs, priority interventions, and information coverage score and gaps.
- [ ] No sector selected = prompt state shown in the right panel.

### Crises Tab
- [ ] Fetch and display crises via the existing `crises.list` tRPC endpoint, filtered to the selected country by location match.
- [ ] Crises list sorted by most recent event signal date descending.
- [ ] Each crisis row shows: title, summary excerpt (max 2 lines), event count, relative timestamp.
- [ ] Fetch and display events via the existing `events.list` tRPC endpoint, filtered to the selected country.
- [ ] Events list uses the shared `EventListCard` component (identical to the Detection page events list).
- [ ] Events list defaults to **Newest first** sort order.
- [ ] Events list includes self-contained filter popover: severity, event type (disaster type hierarchy), source.
- [ ] Events list supports **Load more** — shows 5 items at a time, with a button showing remaining count.
- [ ] Each event row links to `/event/{id}`.

### Sources Tab
- [ ] Display a list of key data sources for the selected country.
- [ ] Each entry shows: organisation name, type badge (UN Agency / INGO / Government / Coordination Body), description, and external link.

### AI Summary
- [ ] Prompt includes: key figures, critical sectors, top hazards, and top context risks.
- [ ] Temperature: 0.3; max tokens: 400.
- [ ] Response replaces any previously generated summary on re-generation.

---

## 🔧 Data Pipeline Requirements

The analysis data is produced by the **CLEAR-AutomatedAnalysis** Python pipeline (`github.com/CLEAR-Initiative/CLEAR-AutomatedAnalysis`). The pipeline code is to be **copied directly into this repository** (no submodule) so that `clear-mvp` is fully self-contained. This section defines both the transfer requirements and the ongoing integration requirements.

---

### Transfer: Direct Copy into `clear-mvp`

#### What to copy

Copy the following files and directories from `CLEAR-AutomatedAnalysis` into a new `pipeline/` directory at the root of `clear-mvp`:

```
CLEAR-AutomatedAnalysis/          →   clear-mvp/pipeline/
  cli/
    __init__.py                   →   pipeline/cli/__init__.py
    create_report_data.py         →   pipeline/cli/create_report_data.py
  src/
    analysis/
      analytical_questions.py     →   pipeline/src/analysis/analytical_questions.py
      context_generation.py       →   pipeline/src/analysis/context_generation.py
      documents_based_analysis.py →   pipeline/src/analysis/documents_based_analysis.py
      generate_ui.py              →   pipeline/src/analysis/generate_ui.py
      merge_numbers.py            →   pipeline/src/analysis/merge_numbers.py
      numbers_extraction.py       →   pipeline/src/analysis/numbers_extraction.py
      web_based_search.py         →   pipeline/src/analysis/web_based_search.py
  pyproject.toml                  →   pipeline/pyproject.toml
  uv.lock                         →   pipeline/uv.lock
```

**Do not copy:**
- `data/` — runtime output, must be gitignored
- `src/viz/` — generated JS/JSON output, must be gitignored
- `report/` — static report assets, not needed by the integration
- `.env` / `.env.*` — secrets, never committed
- `requirements.txt` — superseded by `pyproject.toml` / `uv`
- `README.md`, `LICENSE`, `next-steps.md` — optional, copy at discretion

#### `.gitignore` additions

Add the following to `clear-mvp/.gitignore`:

```
# Pipeline runtime data
pipeline/data/
pipeline/src/viz/
pipeline_data/
```

#### `pipeline/pyproject.toml` changes required after copy

Update the `[project.scripts]` entry point so it resolves correctly from the new location:

```toml
[project.scripts]
clear-create-report-data = "cli.create_report_data:main"
```

No path change needed — the structure is preserved. Verify that `[tool.hatch.build.targets.wheel]` still lists `["src", "cli"]`.

#### Output directory change

In `create_report_data.py`, the pipeline currently writes output to `data/{project_name}/...` and `src/viz/{country}_src/`. After the copy, update these paths to write to `../pipeline_data/{country}/` (relative to `pipeline/`) so the Next.js tRPC layer can read from a stable, predictable location:

```python
# Before
save_folder = os.path.join("data", args.project_name, "analysis")
viz_folder = f"src/viz/{country}_src/"

# After
save_folder = os.path.join("..", "pipeline_data", args.project_name, "analysis")
viz_folder = os.path.join("..", "pipeline_data", args.project_name, "viz", country)
```

Add a `generate_dashboard_data()` call at the end of the `main()` loop (if not already present) that serialises all output fields into a single `../pipeline_data/{country}.json` file. This is the file the tRPC endpoint reads.

#### Developer setup (one-time)

```bash
cd pipeline
uv sync          # installs Python 3.11 venv + all dependencies (~2–3 GB first run)
cp ../.env.example ../.env   # add OPENAI_API_KEY
```

Add to the project root `README.md` or `CONTRIBUTING.md`:

> **Pipeline setup:** Run `cd pipeline && uv sync` after cloning. Requires Python 3.11 and `uv` installed globally (`pip install uv` or `brew install uv`). First sync downloads ~2–3 GB of ML model weights.

#### Private GitHub dependencies

The `pyproject.toml` references five private `git+https://github.com/MediaMonitoringAndAnalysis/...` packages. Any developer or CI runner cloning `clear-mvp` will need:

- A GitHub account with access to the `MediaMonitoringAndAnalysis` org, **or**
- An SSH key / PAT configured for those repositories.

This is a **hard blocker** for open or contractor access. Consider either:
1. Vendoring those packages into `pipeline/vendor/` (copy source, remove git-URL deps), or
2. Publishing them to a private PyPI registry and referencing that instead.

---

### Pipeline Overview

The pipeline runs in two sequential stages:

**Stage 1 — Ingest & Classify** (`cli/create_report_data.py`)

1. Fetches recent ReliefWeb reports and news articles via a paginated URL query filtered by country code and date range.
2. Extracts text passages from PDFs and HTML (via `DocumentsProcessing` and `EntryExtraction` libraries).
3. Chunks each document into overlapping 5-sentence segments.
4. Classifies every segment using **HumBERT** — a fine-tuned multilingual humanitarian NLP model — tagging each passage with a 2D pillar (`Impact` / `Humanitarian Conditions` / `At Risk`) and a sector (`Food Security`, `Health`, `Protection`, `Shelter`, `WASH`, `Livelihoods`, `Nutrition`, `Education`, `Logistics`).
5. Sends classified passages to an OpenAI GPT model for structured information extraction (risks, key numbers, priority needs, priority interventions).
6. Saves intermediate output as JSON and CSV files under `data/{project_name}/analysis/{country}/`.

**Stage 2 — Generate UI Data** (`src/analysis/generate_ui.py`)

1. Reads the intermediate files from Stage 1.
2. Computes per-sector severity using a 0–10 score mapped to: `UNKNOWN → MINOR → MODERATE → SERIOUS → SEVERE → CRITICAL`.
3. Calls an OpenAI GPT model for context risk generation across 9 categories (Demographics, Political, Economy, Socio-culture, Security, Legal & policy, Infrastructure, Environment, Humanitarian Coordination) — `src/analysis/context_generation.py`.
4. Computes information coverage scores and gaps per pillar/sector.
5. Writes structured JSON files and `window.VAR = {...}` JS files to `src/viz/{country}_src/`.

**Entry point:**
```bash
uv run clear-create-report-data \
  --project_name Sudan2026 \
  --countries_to_analyze Sudan \
  --model_name gpt-4.1-nano
```

Estimated runtime: **10–20 minutes** per country (network-bound by ReliefWeb scraping and sequential LLM calls).

---

### Output Files → Frontend Data Mapping

The pipeline writes to `data/{project_name}/analysis/{country}/`. These files map 1:1 to the `CountryData` TypeScript interface in `saf-data.ts`:

| Output file | Frontend field |
|---|---|
| `key_indicator_numbers.json` | `FINAL_NUMBERS_DATA` |
| `context_figures.json` | `OUTPUT_CONTEXT_RISKS_DATA` |
| `risk_list.json` (pillar = hazards/threats) | `CURRENT_HAZARDS_AND_THREATS_DATA` |
| `risk_list.json` (pillar = vulnerabilities) | `PRECRISIS_VULNERABILITIES_DATA` |
| `risk_list.json` (pillar = displacement) | `DISPLACEMENT_RISKS_DATA` |
| `shown_risks.json` | `SHOWN_RISKS_DATA` |
| `priority_needs.json` | `TOP_SECTORAL_NEEDS_DATA` |
| `priority_interventions.json` | `TOP_PRIORITY_INTERVENTIONS_DATA` |
| `classification_dataset.csv` (top sources) | `TOP_5_SOURCES_DATA` |
| `information_coverage_gaps.json` | `INFORMATION_COVERAGE_DATA` |

A new `generate_dashboard_data()` entry point in `generate_ui.py` aggregates all of these into a single dict that should be serialised to `pipeline_data/{country}.json` for the Next.js tRPC layer to consume.

---

### Integration Architecture (Next.js ↔ Pipeline)

```
Admin triggers refresh (tRPC: analysis.triggerPipeline)
  │
  ├─ Check cooldown (default: 10 min) — reject if too recent
  ├─ Check status — reject if already running
  │
  ▼
Write pipeline_data/pipeline_status.json { status: "running" }
Spawn detached subprocess: uv run clear-create-report-data ...
  │
  │  (10–20 min)
  │
  ▼
Pipeline exits → write pipeline_data/sudan.json
               → write pipeline_status.json { status: "success" }

Analysis page (tRPC: analysis.getCountryData)
  → reads pipeline_data/sudan.json and returns CountryData
```

**`pipeline_status.json` schema:**
```json
{
  "status": "idle | running | success | error",
  "started_at": "ISO string | null",
  "completed_at": "ISO string | null",
  "last_success_at": "ISO string | null",
  "error": "string | null"
}
```

---

### Pipeline Requirements

#### Environment

- [ ] Python `>=3.11, <3.12` installed on the server running Next.js (or a sidecar container).
- [ ] `uv` package manager installed and on `PATH`.
- [ ] `pipeline/` directory present at repo root with dependencies installed via `cd pipeline && uv sync` (see Transfer section above).
- [ ] First `uv sync` downloads ~2–3 GB (PyTorch + HumBERT model weights) — cache this in CI/Docker to avoid repeated downloads.
- [ ] Access to the five private `MediaMonitoringAndAnalysis` GitHub org repositories required at `uv sync` time (see Private GitHub dependencies note above).

#### Environment Variables (server-side)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Used by Stage 1 (numbers extraction) and Stage 2 (context generation). |
| `PIPELINE_DIR` | No | Path to the pipeline directory. Default: `./pipeline` (the copied directory). |
| `PIPELINE_DATA_DIR` | No | Path where output JSON files are written. Default: `./pipeline_data`. |
| `PIPELINE_COOLDOWN_MINUTES` | No | Minimum minutes between runs per country. Default: `10`. |

#### tRPC Endpoints (new — `src/server/api/routers/analysis.ts`)

- [ ] `analysis.getCountryData` — reads `pipeline_data/{country}.json`, returns `CountryData`. Throws `NOT_FOUND` if the file does not exist (first run).
- [ ] `analysis.getPipelineStatus` — reads `pipeline_status.json`, returns run state. Returns `{ status: "idle" }` if the file does not exist.
- [ ] `analysis.triggerPipeline` — `orgAdminProcedure` only. Validates cooldown, writes status file, spawns `uv run clear-create-report-data` as a detached child process, returns `{ accepted: true }`.

#### Admin UI (org-admin users only)

- [ ] **Refresh button** in the Analysis page header — calls `analysis.triggerPipeline`.
- [ ] Button disabled while `status === "running"` or cooldown is active; shows tooltip with time remaining during cooldown.
- [ ] Status indicator shows: last updated timestamp (relative), current status, and any error message.
- [ ] Polls `analysis.getPipelineStatus` every 15 seconds while `status === "running"` to detect completion without page reload.
- [ ] On successful completion, invalidates `analysis.getCountryData` query to reload fresh data.

#### Known Bugs to Fix Before Production

| Location | Bug | Fix |
|---|---|---|
| `cli/create_report_data.py:164` | `args.countries_to_analyze.split(",")` called on a list (`nargs="+"` already returns a list) | Replace with `args.countries_to_analyze` directly |
| `cli/create_report_data.py:16` | `RW_url` has a hardcoded date range (`DO20260315-20260321`) | Compute a rolling window dynamically at runtime (e.g. last 14 days) |
| `src/analysis/context_generation.py:125` | `OpenAI()` client re-instantiated inside every `invoke()` call | Instantiate once at class `__init__` |
| `src/analysis/context_generation.py:52` | Regex `r".*"` missing `re.DOTALL` flag — silently drops multi-line GPT responses | Add `re.DOTALL` to the `re.search()` call |
| `src/analysis/generate_ui.py` (`generate_final_numbers`) | Sort using `.isin()` does not guarantee deterministic position order | Replace with `pd.Categorical` ordered sort |

#### Deployment Considerations

- **PaaS (Vercel, Render, Railway)**: Managed platforms do not support long-lived child processes or guaranteed Python environments. Extract the pipeline trigger into a **separate worker service** (e.g. a lightweight FastAPI container) and call its `POST /run` from the tRPC `triggerPipeline` endpoint.
- **Self-hosted / Docker**: Bundle both Node.js and Python 3.11 + uv in a single Docker image, or use Docker Compose with a sidecar pipeline container sharing a volume for `pipeline_data/`.
- **HumBERT model weights**: ~2–3 GB download on first run. Pre-download and cache in the Docker image or a persistent volume to avoid startup delays.
- **GPU**: Optional — HumBERT classification is faster with a CUDA GPU but runs on CPU. At ~10,000 passages per country run, CPU inference takes roughly 5–10 additional minutes.

---

## ❓ Clarifications

- **Data freshness**: The analysis data is currently hardcoded from a manual pipeline run. Should data refresh be triggered manually by an admin (pipeline run button), on a schedule, or on-demand per page load? What SLA is acceptable for data age?
- **Country coverage**: Which countries should be supported at launch — Sudan only, or a broader list? What is the process for onboarding a new country (pipeline configuration, data sources)?
- **LLM endpoint**: The current `llm.query` tRPC procedure is a stub. What model, infrastructure, and auth approach should the production endpoint use? Is there a cost or rate-limit concern per user?
- **Crises / Events source of truth**: The Crises and Events tabs pull from the Apollo GraphQL backend (live data). Should these be filtered server-side by country, or is client-side filtering on name-match acceptable at scale?
- **Sector severity thresholds**: Who owns the severity classification logic in the pipeline? Should coordinators be able to override a severity rating in the UI, or is it read-only output?
- **Print / Export**: Is `window.print()` sufficient, or do users need a formatted PDF with NRC branding (requiring a server-side PDF renderer)?
- **Permissions**: Should the Generate Summary and Export actions be available to all authenticated users, or restricted to specific roles?
