# CLEAR Pipeline Integration — PRD

This document describes how to connect the `CLEAR-AutomatedAnalysis` Python pipeline to the `clear-mvp` Next.js frontend, replacing the current hardcoded prototype data with live, refreshable analysis.

---

## 1. Background

### What the pipeline does

`CLEAR-AutomatedAnalysis` is a Python CLI that produces structured humanitarian situation analysis from public data sources. It runs in two stages:

**Stage 1 — Ingest & classify (`create_report_data.py`)**
- Fetches recent ReliefWeb documents (news articles, reports) for one or more countries via the ReliefWeb API
- Classifies each text passage using **HumBERT** — a multilingual humanitarian NLP model — tagging by pillar (Impact, Humanitarian Conditions, At Risk) and sector (Health, Food Security, Shelter, etc.)
- Calls **OpenAI GPT** to extract structured facts from each classified passage
- Writes intermediate JSON output to disk

**Stage 2 — Generate UI data (`generate_ui.py`)**
- Reads Stage 1 JSON outputs
- Applies severity thresholds and coverage scoring
- Produces the final structured data objects used by the frontend

The pipeline is invoked as:
```bash
uv run clear-create-report-data --countries lebanon sudan
```

### Current state of the frontend

The Analysis page (`src/app/(app)/analysis/page.tsx`) currently reads from `saf-data.ts`, which contains **hardcoded data hand-copied from a single pipeline run**. No live data pipeline connection exists. This document specifies how to build that connection.

---

## 2. Data Contract

### TypeScript `CountryData` interface

Defined in `src/app/(app)/analysis/_components/saf-data.ts`. All pipeline output must conform to this shape:

```typescript
interface SectorSeverity {
  severity_scale: "CRITICAL" | "SEVERE" | "SERIOUS" | "MODERATE" | "NO CONCERN";
  key_messages: string[];
  top_sources: string[];
}

interface CountryData {
  FINAL_NUMBERS_DATA: Array<{
    what_happened: string;
    number: number;
    unit: string;
  }>;
  OUTPUT_CONTEXT_RISKS_DATA: Record<string, string[]>;
  CURRENT_HAZARDS_AND_THREATS_DATA: string[];
  PRECRISIS_VULNERABILITIES_DATA: string[];
  DISPLACEMENT_RISKS_DATA: {
    "Push Factors": string[];
    Intentions: string[];
  };
  SHOWN_RISKS_DATA: {
    Impact: Record<string, SectorSeverity>;
    "Humanitarian Conditions": Record<string, SectorSeverity>;
    "At Risk": Record<string, SectorSeverity>;
  };
  TOP_SECTORAL_NEEDS_DATA: Record<string, string[]>;
  TOP_PRIORITY_INTERVENTIONS_DATA: Record<string, string[]>;
  TOP_5_SOURCES_DATA: string[];
  INFORMATION_COVERAGE_DATA: {
    overall_score: number;
    analysis: Array<{
      pillar: string;
      entries: Array<{
        sector: string;
        coverage: number;
        gaps: string[];
      }>;
    }>;
  };
}
```

### Pipeline output → TypeScript field mapping

| TypeScript field | Pipeline source | Notes |
|---|---|---|
| `FINAL_NUMBERS_DATA` | `generate_final_numbers()` in `generate_ui.py` | Array of key figures |
| `OUTPUT_CONTEXT_RISKS_DATA` | `generate_context_risks()` | Dict of context/risk categories → bullet strings |
| `CURRENT_HAZARDS_AND_THREATS_DATA` | `generate_hazards_and_threats()` | List of strings |
| `PRECRISIS_VULNERABILITIES_DATA` | `generate_precrisis_vulnerabilities()` | List of strings |
| `DISPLACEMENT_RISKS_DATA` | `generate_displacement_risks()` | Object with Push Factors and Intentions arrays |
| `SHOWN_RISKS_DATA` | `generate_shown_risks()` | Nested by pillar → sector → SectorSeverity |
| `TOP_SECTORAL_NEEDS_DATA` | `generate_top_sectoral_needs()` | Dict sector → bullets |
| `TOP_PRIORITY_INTERVENTIONS_DATA` | `generate_top_priority_interventions()` | Dict sector → bullets |
| `TOP_5_SOURCES_DATA` | `generate_top_5_sources()` | Array of 5 source strings |
| `INFORMATION_COVERAGE_DATA` | `generate_information_coverage()` | Coverage scoring with gaps |

The pipeline's `generate_dashboard_data()` function in `generate_ui.py` returns an object containing all of these fields. The JSON serialisation of that object is the canonical transfer format.

---

## 3. Proposed Architecture

### Guiding principle

**Stateless, file-based integration.** The pipeline writes JSON files to disk; Next.js reads them on demand. No database or message queue is required for this integration.

### Directory layout

```
clear-mvp/
  pipeline/                          # pipeline submodule or symlink
    pyproject.toml
    uv.lock
    cli/create_report_data.py
    src/analysis/generate_ui.py
    ...
  pipeline_data/                     # gitignored runtime directory
    lebanon.json                     # latest pipeline output per country
    sudan.json
    pipeline_status.json             # run state metadata
```

`pipeline_data/` must be added to `.gitignore` — it is runtime state, not source.

### `pipeline_status.json` schema

```json
{
  "status": "idle" | "running" | "success" | "error",
  "countries": ["lebanon", "sudan"],
  "started_at": "2026-05-11T10:00:00Z",
  "completed_at": "2026-05-11T10:08:32Z",
  "last_success_at": "2026-05-11T10:08:32Z",
  "error": null | "string describing error"
}
```

### Data flow

```
Admin clicks Refresh
       │
       ▼
tRPC analysis.triggerPipeline
       │
       ├─ Check cooldown: last_success_at + cooldown_minutes > now → reject
       ├─ Check status: "running" → reject (already in progress)
       │
       ▼
Write pipeline_status.json { status: "running", started_at: now }
       │
       ▼
Spawn: uv run clear-create-report-data --countries lebanon,sudan
       │  (detached child process, does not block HTTP response)
       │
       ▼
Return { accepted: true, started_at }
       │
       │   (pipeline runs ~5–10 min)
       │
       ▼
Pipeline on success:
  Write pipeline_data/lebanon.json
  Write pipeline_data/sudan.json
  Write pipeline_status.json { status: "success", completed_at, last_success_at }

Pipeline on failure:
  Write pipeline_status.json { status: "error", error: "..." }
```

### tRPC endpoints

Add a new `analysis` router at `src/server/api/routers/analysis.ts` and register it in `src/server/api/root.ts`.

#### `analysis.getCountryData`

```typescript
// Input
{ country: z.enum(["lebanon", "sudan"]) }

// Returns
CountryData  // (the TypeScript interface above)

// Implementation
// Read pipeline_data/{country}.json, parse, return.
// Throw TRPCError NOT_FOUND if the file does not exist yet.
```

#### `analysis.getPipelineStatus`

```typescript
// Input: none

// Returns
{
  status: "idle" | "running" | "success" | "error";
  started_at: string | null;
  completed_at: string | null;
  last_success_at: string | null;
  error: string | null;
}

// Implementation
// Read pipeline_data/pipeline_status.json.
// If file does not exist, return { status: "idle", ... nulls }.
```

#### `analysis.triggerPipeline`

```typescript
// Procedure: orgAdminProcedure (authenticated, org-admin only)
// Input: none  (or optional { countries: string[] } for future flexibility)

// Returns
{ accepted: boolean; reason?: string; started_at?: string }

// Implementation (pseudo-code)
const status = readStatusFile();
const cooldownMs = PIPELINE_COOLDOWN_MINUTES * 60 * 1000;
const now = Date.now();

if (status.status === "running") {
  return { accepted: false, reason: "Pipeline is already running" };
}

if (status.last_success_at) {
  const elapsed = now - new Date(status.last_success_at).getTime();
  if (elapsed < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
    return { accepted: false, reason: `Cooldown active — try again in ${remaining} min` };
  }
}

writeStatusFile({ status: "running", started_at: new Date().toISOString() });
spawnPipeline();  // detached child process
return { accepted: true, started_at: new Date().toISOString() };
```

### Admin UI component

Add a `PipelineAdmin` component, visible to org-admin users only, on the Analysis page. Suggested placement: inside the `PageHeader` action group, or in a settings drawer.

**Component behaviour:**

| State | UI |
|---|---|
| `status = idle`, no data | "No data yet" + enabled Refresh button |
| `status = running` | Spinner, "Generating data…", disabled Refresh button |
| `status = success` | "Last updated: {relative time}" + enabled Refresh button |
| `status = error` | Error message in red + enabled Refresh button |
| Cooldown active | Disabled Refresh button with tooltip showing time remaining |

Poll `analysis.getPipelineStatus` every 15 seconds while `status === "running"`, to detect completion without requiring a page reload.

**Suggested implementation sketch:**

```tsx
// Polls every 15s while running; switches analysis page to live data
const { data: pipelineStatus } = api.analysis.getPipelineStatus.useQuery(undefined, {
  refetchInterval: (data) => data?.status === "running" ? 15_000 : false,
});

const triggerMutation = api.analysis.triggerPipeline.useMutation({
  onSuccess: () => utils.analysis.getPipelineStatus.invalidate(),
});
```

---

## 4. Environment Variables

Add the following to `.env.example` and document in deployment config:

| Variable | Default | Description |
|---|---|---|
| `PIPELINE_DATA_DIR` | `./pipeline_data` | Absolute or relative path to the runtime data directory |
| `PIPELINE_DIR` | `./pipeline` | Path to the CLEAR-AutomatedAnalysis checkout |
| `PIPELINE_COOLDOWN_MINUTES` | `10` | Minimum minutes between pipeline runs |
| `OPENAI_API_KEY` | *(required)* | Required by the pipeline for GPT calls |

The `OPENAI_API_KEY` must be available in the server environment at pipeline trigger time; it is passed through to the spawned subprocess.

---

## 5. Pipeline Bugs to Fix Before Production

The following bugs were identified in `CLEAR-AutomatedAnalysis` and must be resolved before this integration will work reliably.

### `create_report_data.py` — `args.countries` is already a list

```python
# Current (broken):
countries = args.countries_to_analyze.split(",")

# Fix: nargs="+" in argparse returns a list; do not call .split()
countries = args.countries_to_analyze
```

### `create_report_data.py` — hardcoded ReliefWeb date range

```python
# Current:
RW_url = "https://api.reliefweb.int/v1/reports?...DO20260315-20260321..."
```

The date range is hardcoded to a single week from a previous run. This must be made dynamic, e.g. a rolling 14-day window computed at runtime from today's date, or an `--after-date` CLI argument.

### `context_generation.py` — incorrect model name

```python
# Current:
model = "gpt-5-mini"

# Fix:
model = "gpt-4.1-mini"   # or "gpt-4o-mini" — verify against your OpenAI org
```

### `context_generation.py` — OpenAI client re-instantiated on every call

```python
# Current: OpenAI() constructed inside the invoke() loop body
# Fix: instantiate once at module or class level
```

### `context_generation.py` — regex missing `re.DOTALL`

```python
# Current:
re.search(r"<analysis>(.*?)</analysis>", text)

# Fix:
re.search(r"<analysis>(.*?)</analysis>", text, re.DOTALL)
```

Without `re.DOTALL`, `.*?` does not match newlines, silently dropping multi-line responses.

### `generate_ui.py` — `generate_final_numbers` sort is unstable

The sort applied to the final numbers DataFrame uses `.isin()` for ordering which does not guarantee deterministic output order. Replace with an explicit positional sort or `pd.Categorical` with an ordered category list.

---

## 6. Dependency Considerations

The pipeline has heavy Python dependencies that affect where it can run:

| Dependency | Notes |
|---|---|
| `torch` + `sentence-transformers` | ~2–3 GB download; GPU optional but faster |
| `ultralytics` + `onnxruntime` | Object detection — may not be needed for text-only pipeline |
| 5 private git-URL deps | Require access to MediaMonitoringAndAnalysis GitHub org |
| `uv` | Must be installed on the server; not available by default |

**Implication for deployment:** The Next.js server that triggers the pipeline must have Python ≥ 3.11 < 3.12, `uv`, and the `pipeline/` directory with all dependencies installed available on the same machine (or a sidecar container). A containerised deployment (e.g. a Docker image that bundles both the Node.js app and the Python environment) is the recommended path to avoid environment mismatches.

If the deployment target is a managed PaaS (Vercel, Render, Railway) that does not support arbitrary subprocesses, the pipeline trigger should be extracted to a **separate worker service** (e.g. a small FastAPI server) that exposes a `POST /run` endpoint. The Next.js tRPC router then calls that endpoint instead of spawning a subprocess directly.

---

## 7. Implementation Checklist

- [ ] Add `CLEAR-AutomatedAnalysis` as a git submodule at `pipeline/`
- [ ] Fix pipeline bugs listed in Section 5
- [ ] Create `pipeline_data/` directory (gitignored)
- [ ] Write `src/server/api/routers/analysis.ts` with three endpoints
- [ ] Register `analysis` router in `src/server/api/root.ts`
- [ ] Update `src/server/env.ts` with new env vars
- [ ] Update `src/app/(app)/analysis/page.tsx` to call `api.analysis.getCountryData` instead of reading from `saf-data.ts`
- [ ] Build `PipelineAdmin` component with polling, cooldown display, error state
- [ ] Gate `PipelineAdmin` and `triggerPipeline` behind `orgAdminProcedure` / org-admin role check
- [ ] Add env vars to `.env.example` and deployment docs
- [ ] Verify pipeline end-to-end with real ReliefWeb data in a dev environment
- [ ] Fix `sectors-tab.tsx` line 609 `dangerouslySetInnerHTML` — sanitise or strip HTML from pipeline output before rendering (security)
