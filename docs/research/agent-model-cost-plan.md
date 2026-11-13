# CLEAR Agent: model, cost and routing plan

Date: 2026-10-31. Scope: the CLEAR Agent in clear-mvp (`src/server/agent/`, `src/app/api/agent/route.ts`).

## 1. What runs today

| Question | Answer |
|---|---|
| Framework | Mastra `Agent` (`@mastra/core` 1.73) streamed through `@mastra/ai-sdk` as an AI SDK v7 UI stream. |
| Model | Whatever `CLEAR_AGENT_MODEL` says, a Mastra model-router string. No model name in code (`model.ts`). |
| Dev | `anthropic/claude-sonnet-5-5`, direct to Anthropic with `ANTHROPIC_API_KEY` (clear-infra `envs/dev/terraform.tfvars`). |
| Prod | `clear_agent_model` is **not set** in `envs/prod/terraform.tfvars`, so `/api/agent` answers 503 `AGENT_NOT_CONFIGURED`. The Agent is a dev-only cost right now. |
| OpenRouter | **Not used** by the frontend. clear-pipeline uses it (`OPENROUTER_API_KEY` in the Dagster env). Mastra's router does know `openrouter/<model>` and reads `OPENROUTER_API_KEY`. |
| Effort / thinking | Not set. Sonnet 5.5 therefore runs at its default effort `high` with adaptive thinking. |
| Prompt caching | Not enabled. Every token of every step is billed at the full input rate. |
| Budget | clear-api enforces `AGENT_DAILY_BUDGET_USD` per user per UTC day (dev: $2). Cost is computed in `pricing.ts` from a static table keyed by model id, all input priced at the full rate. An unpriced model fails startup. |
| Tools | NRC Find, and with `agent_clear_data` on: 15 curated clear-mcp tools plus `navigate`. Tool descriptions alone are ~2k tokens. |
| History | Last 20 messages per Thread, tool calls and results included (`HISTORY_MESSAGES`). |

## 2. What the dev database says (last 60 days, read-only)

| Metric | Value |
|---|---|
| Turns | 34 (about 1 to 2 a day) |
| Total cost | $7.51 |
| Average cost per turn | $0.22 (max $0.52) |
| Input tokens per turn | avg 94k, median 82k, max 242k |
| Output tokens per turn | avg 3.3k |
| Latency | median 26 s |
| Turns that called tools | 31 of 34 (median 2 tool calls, max 15) |

Input tokens are summed across every step of the tool loop, and each step re-sends the
system prompt, all tool definitions, the 20-message history (with earlier turns' tool
results) and the working memory. That is where the money goes:

| Share of a typical turn | Cost |
|---|---|
| Input (94k × $2/M) | $0.19 (about 85%) |
| Output (3.3k × $10/M) | $0.03 (about 15%) |

The user messages themselves are short and routine ("What's new in the last 24 hours?",
"Show me Khartoum on the map", "Which Events here are the most severe?"). They are
pedestrian in reasoning but not in work: almost all of them need tool calls. So the
premise "we are paying for max intelligence on simple messages" is only half right.
We are not on the top model, but we are paying the top *input* price for every step
because nothing is cached or pruned, and the model is thinking at `high` effort on
questions that do not need it.

## 3. The levers, in order of payoff per unit of risk

Prices are Anthropic first-party, checked 2026-10-31.

| Model | Input $/M | Cache read $/M | Output $/M | Notes |
|---|---|---|---|---|
| Opus 5.5 | 4.00 | 0.20 | 20.00 | default effort `medium` |
| Sonnet 5.5 | 2.00 | 0.10 | 10.00 | default effort `high` (what dev runs) |
| Haiku 5.5 (prompt ≤ 100k) | 0.10 | 0.01 | 0.50 | default effort `medium`; new, not in `pricing.ts` |
| Haiku 5.5 (prompt > 100k) | 0.50 | 0.05 | 2.50 | 5× jump, so history size matters more on Haiku |

### Lever 1: prompt caching (free, no quality change)

Mastra's bundled Anthropic provider accepts `providerOptions.anthropic.cacheControl:
{ type: "ephemeral" }`, which is Anthropic's automatic top-level caching. On Sonnet 5.5 a
cache read costs 5% of the input price. In a multi-step turn every step after the first
reads the same prefix, and the next turn in the same Thread reads most of it again.

Expected: input cost down 60 to 80%, so roughly $0.22 → $0.06 to $0.09 per turn.

Required change: `pricing.ts` and `recordTurnUsage` must price cached input separately
(the AI SDK usage object reports cached input tokens). Today the budget would keep
charging cache reads at the full rate, which hides the saving from the budget.

### Lever 2: effort (small quality risk, measurable)

Set `providerOptions.anthropic.effort` explicitly. Anthropic's guidance for Sonnet 5.5
is `medium` for multi-step tool use and `low` for chat, and to re-run the sweep rather
than trust the default. Lower effort also means fewer, more consolidated tool calls,
which cuts the number of steps and therefore input tokens again.

Expected: fewer steps and 30 to 50% less output. Start at `medium`, measure, try `low`.

### Lever 3: stop re-sending old tool results (medium effort, big win)

Old tool results are the bulk of the 20-message history. Two options:

- Anthropic context editing: `providerOptions.anthropic.contextManagement` with
  `clear_tool_uses_20250919` clears old tool results server-side. Mastra's provider
  types expose it. Verify the provider sends the beta header.
- Or cap history differently in Mastra Memory (fewer messages, or strip tool-result
  parts from history before the model sees them).

Expected: per-step input drops from tens of thousands of tokens to under 15k. This is
also the prerequisite for Haiku 5.5 to stay under its 100k-token price break.

### Lever 4: cheaper default model (needs an eval)

Haiku 5.5 is 20× cheaper than Sonnet 5.5 and Anthropic positions it for exactly
this kind of high-volume, latency-sensitive work. Whether it is good enough to drive
15 data tools and the map correctly is an empirical question. We have 34 real
questions in the dev database to build the eval from.

### Lever 5: per-turn routing (only if the eval shows a real split)

Routing pays off only when there is a mix of turns that a small model handles and
turns that genuinely need a big one. Three ways to do it:

**(a) OpenRouter Jev Router.** Set the model to `typesafe/jev-router` with the
`jev-router` plugin (`cost_tier`, `allowed_models`, `excluded_models`); Jev scores each
prompt for task, difficulty and precision and picks a model *and* reasoning effort.
Zero classifier code to own. Costs and caveats:

- Adds OpenRouter and TypeSafe as processors of NRC conversation data. `model.ts`
  already notes NRC's data-handling answer is pending; this needs that answer first.
- Prompt caches and thinking blocks are model-scoped, so a router that switches models
  between turns of one Thread forfeits Lever 1 on every switch.
- `pricing.ts` keys cost by the configured model id. With a router the billed model
  comes back in the response, so the budget must price what actually ran (OpenRouter
  can return a `cost` field) or carry a price for every allowed candidate.
- Mastra's registry lists `openrouter/auto` but not `typesafe/jev-router`. Whether an
  unlisted id passes through, or whether we need `@openrouter/ai-sdk-provider`
  directly, is unverified.
- Its docs give no routing fee, no latency figure and no model list. Measure before
  committing.

**(b) Jev as a classifier, Anthropic for the answer.** Ask Jev (TypeSafe API, or
`typesafe/jev` on OpenRouter) one Choice question per turn ("trivial / data lookup /
analysis") and map the answer to model + effort ourselves via Mastra's dynamic `model`
argument. Keeps the conversation on Anthropic; only the user's message text leaves.

**(c) Anthropic only.** Haiku 5.5 as the classifier (one tiny call, under $0.001) or
plain heuristics, then the same dynamic `model` argument. No new vendor, no new
data-processing agreement, no new secret in clear-infra. Route per Thread rather than
per turn to keep the cache warm.

Recommendation: (c) unless the eval shows Jev's scoring beats a Haiku classifier on
our questions, and (a) only after NRC's data-handling answer.

## 4. Plan

### Phase 1: pay less for the same answers (one PR, clear-mvp)

1. Add `providerOptions` to the Agent in `create-clear-agent.ts`: `cacheControl:
   { type: "ephemeral" }`, `effort: "medium"`.
2. Record cached input tokens in `recordTurnUsage` and price them in `pricing.ts`
   (cache read rate per model). Add `anthropic/claude-haiku-5-5` and
   `anthropic/claude-opus-5-5` rows with cache-read prices; keep the startup guard.
   Haiku's over-100k tier can be priced at the high rate to stay conservative.
3. Make `effort` and the history size configurable (`CLEAR_AGENT_EFFORT`,
   `CLEAR_AGENT_HISTORY_MESSAGES`) through `src/server/env.ts`, `.env.example`, README.
4. Try `contextManagement` (clear old tool uses). If the provider does not send the
   beta header, fall back to a smaller `HISTORY_MESSAGES` (10) and measure.
5. Deploy to dev, watch two weeks of `conversation_messages` usage. Target: average
   turn under $0.06 with no change in answer quality.

### Phase 2: pick the default model with evidence (half a day)

1. Build an eval from the 34 dev questions plus 15 to 20 written ones, graded on
   "did it call the right tools and answer / navigate correctly" (`/claude-api
   build-eval` has the recipe).
2. Run Haiku 5.5, Sonnet 5.5 and Opus 5.5 at `low` and `medium` effort. Score cost per
   completed task and latency, not per request.
3. Set `CLEAR_AGENT_MODEL` in dev to the cheapest model that passes. Expected outcome:
   Haiku 5.5 at `medium` for the data-tool turns.

### Phase 3: routing, only if Phase 2 shows a split

1. Add a `requestContext` driven `model` and `providerOptions` (both accept a function
   in Mastra) and a `CLEAR_AGENT_ROUTER=off|haiku|jev|openrouter` switch.
2. Start with (c): Haiku 5.5 classifies the turn into tier → model + effort, decided
   once per Thread. Log the chosen tier next to the usage row so the eval can audit it.
3. Revisit (a) Jev Router on OpenRouter when NRC confirms third-party processing is
   acceptable, and compare against (c) on the same eval.

### Prod

Prod has no Agent model configured. Before switching it on, Phase 1 must be in, the
daily budget set, and the prompt-caching cost recorded, or the $2/day budget will
throttle users after about nine turns.

## 5. Sources

- Anthropic model overview and pricing (platform.claude.com, 2026-10-31).
- OpenRouter Jev Router docs: https://openrouter.ai/docs/guides/routing/routers/jev-router
- OpenRouter Auto Router docs: https://openrouter.ai/docs/guides/routing/routers/auto-router
- OpenRouter Jev community page: https://openrouter.ai/docs/guides/community/jev
- Dev database `conversation_messages`, read-only, last 60 days.

## 6. Analysis of the recorded requests (added 2026-10-31)

All 34 user turns ever recorded (dev, 2026-10-01 to 10-28), classified by hand.

| Category | Turns | Spend | Avg $/turn | Avg input tokens | Avg tool calls | Median latency |
|---|---|---|---|---|---|---|
| Data lookup ("what's happening in South Kordofan", "alerts in the last 6 hours") | 11 | $2.84 | 0.26 | 110k | 2.5 | 35 s |
| Navigation ("show me Khartoum on the map") | 9 | $2.03 | 0.23 | 99k | 4.1 | 23 s |
| Canned briefing ("What's new in the last 24 hours?", word for word) | 8 | $1.27 | 0.16 | 61k | 3.1 | 27 s |
| Analysis (time series, displacement flows, "turn into a chart") | 3 | $0.86 | 0.29 | 124k | 3.7 | 31 s |
| Pasted junk (a bot transcript) | 1 | $0.26 | 0.26 | 123k | 14 | 11 s |
| Meta / chit-chat ("test", "show me around") | 2 | $0.25 | 0.12 | 54k | 0 | 15 s |

Three findings decide the strategy:

**Cost follows thread position, not question difficulty.**

| Turn in thread | Turns | Avg input tokens | Avg $/turn |
|---|---|---|---|
| 1 | 16 | 58k | 0.15 |
| 2 | 6 | 102k | 0.24 |
| 3 | 5 | 102k | 0.23 |
| 4 | 3 | 166k | 0.36 |
| 5+ | 4 | 161k | 0.36 |

Half of all spend comes from turns three and later. The two most pedestrian
messages in the set, "Show me around this application" and "Turn the above into a
graph chart", made zero tool calls and still cost $0.24 and $0.29, because by then the
20-message history held about 100k tokens of earlier tool results. A fresh thread
starts at about 16k tokens per step. No model choice fixes this; pruning does.

**Tool thrash, not reasoning, drives the worst turns.** "show me al-fula" cost $0.44
with 9 tool calls, 6 of them `clear_find_location`. "show me the center of sudan and
all health related crisis..." made 15 calls, 8 of them `clear_find_location`. Location
lookup fails on fuzzy names and the model retries. A fuzzy `find_location` (or
returning near matches on a miss) removes those steps for any model.

**One question is a quarter of the traffic.** "What's new in the last 24 hours?" is
asked verbatim 8 times (plus "Show me alerts in the last 6 hours" as a variant). It
runs 3 tool calls and 61k tokens every time. It should be a prebuilt briefing: run the
queries in code, hand the model the results once, or cache per team per hour.

### What each strategy would have cost on these exact 34 turns

Assumptions: caching turns 80% of input into cache reads; effort `medium` cuts output
30% and steps 20%; pruning caps per-step context at 20k tokens.

| Strategy | Cost | vs today |
|---|---|---|
| A. Today: Sonnet 5.5, high effort, no cache | $7.51 | 100% |
| B. A + prompt caching | $2.65 | 35% |
| C. B + effort medium | $2.01 | 27% |
| D. C + prune old tool results from history | $1.65 | 22% |
| E. D on Haiku 5.5 for everything | $0.09 | 1% |
| F. D, Haiku for navigation/canned/meta, Sonnet for lookup/analysis | $0.80 | 11% |
| G. Haiku 5.5 on today's raw traffic, no pruning | $0.48 | 6% |
| H. D on Opus 5.5 for everything (quality ceiling) | $3.30 | 44% |

### What this says about routing

- The hygiene levers (B, C, D) take 78% off with the same model and no quality risk.
  They come first regardless of model.
- Model choice is the next 10x. Haiku 5.5 everywhere is 18x cheaper than Sonnet after
  hygiene. Even an Opus-everywhere Agent (H) would cost less than half of today.
- Per-turn routing (F) sits between E and D. On this traffic it saves $0.85 over
  Sonnet-everywhere and costs $0.71 more than Haiku-everywhere. At 34 turns a month
  that is not worth a classifier, a second vendor, or the cache misses from switching
  models mid-thread. Routing only earns its keep if the eval shows Haiku fails the
  lookup and analysis turns while Sonnet passes them, and even then a per-thread
  choice beats per-turn.
- The right order is therefore: hygiene PR, then an eval of Haiku 5.5 vs Sonnet 5.5
  on these 34 questions (they are the eval set), then pick one default. Decide about
  Jev or any router only from that eval's failures, not up front.
- Two product fixes save more than any router: a fuzzy `find_location`, and a
  prebuilt "what's new" briefing.

## 7. Revisions after a second-opinion review (2026-10-31)

A ChatGPT review of sections 1 to 6 was checked claim by claim against the installed
Mastra 1.73 and live docs. What changed:

**Accepted, and the plan is updated for it**

- **Instrument per step before optimising.** `totalUsage` sums every step of a turn,
  which hid per-request sizes. Log each model call (input, output, cache read, cache
  write, model, tool calls, latency) via Mastra's step hooks first. New P0.
- **Haiku's 100k price break is per request, not per turn.** Correct. The median step
  is ~21k tokens, so most requests stay in the cheap tier. But the late-thread single
  requests already exceed 100k (the two zero-tool turns were 106k and 123k in one
  call), so pruning is still what keeps Haiku cheap. Nuance, not reversal.
- **Caching has caveats.** Cache writes cost 1.25×, a top-level effort change
  invalidates the cache, and Anthropic's tool-result clearing invalidates it too and
  only fires at 100k tokens per request by default (configurable, beta header
  `context-management-2025-06-27`). So: set effort once per deployment, prune history
  on our side, and measure `cache_read_input_tokens` before trusting the projection.
- **A better pruning lever exists in Mastra.** `ToolCallFilter` (`@mastra/core/processors`)
  strips old tool calls and results from the prompt at request time, keeps the current
  run's results, never rewrites stored history, and needs no Anthropic beta. Prefer it
  over Anthropic context editing for Phase 1.
- **Cheap default with explicit escalation beats one model per thread.** Accepted as the
  routing shape if routing is ever adopted.
- **Benchmark beyond Anthropic.** Mastra router strings make this cheap. Add GPT-6 Luna
  ($0.10/$0.50, same price as Haiku 5.5) and Gemini 3.8 Flash ($0.825/$4.125 on
  OpenRouter, lower direct) to the eval. Each new provider is a new data processor and
  a new secret in clear-infra, so shipping one needs NRC's sign-off; evaluating it does
  not.
- **Latency matters more than dollars at this volume.** $7.51 over two months is not the
  problem; a 26 s median answer is. Pruning, lower effort and a fuzzy `find_location`
  cut both.

**Checked and confirmed, with limits the review understated**

- `ModelSelectionProcessor` is in `@mastra/core` 1.73 (`processors/model-selection`)
  and Mastra's docs show it with `typeSafeAi.decisionModel('jev-latest')`. It removes
  the custom classifier code. But: it classifies **only the latest user message** (the
  implementation calls `latestUserText`), it sends no current view or history, and it
  adds a classifier round-trip to every request including ones it abstains on. "Which
  Events here are the most severe?" cannot be routed well on its text alone. Mastra's
  own docs warn that routing can cost more than it saves because caches are not shared
  between models. It stays a Phase 3 experiment, not a given.
- Jev costs $0.042 per million input tokens, output free, 64k tokens per request
  (TypeSafe docs). A classification call is effectively free.
- Jev Router's `allowed_models` is a preference that can fall back outside the list;
  only `excluded_models` is hard. Confirmed in OpenRouter's docs.

**Not changed**

- Order of work: hygiene, then eval, then routing only if the eval shows a split.
- The 34 recorded turns are the core eval set, extended with multi-turn, bad-tool-result
  and ambiguous cases.
- Jev or any OpenRouter path waits on NRC's data-handling answer. Whether OpenRouter's
  zero-data-retention setting covers the Jev Router plugin is unverified.

### Revised plan

| Priority | Change | Validation |
|---|---|---|
| P0 | Per-step instrumentation (tokens, cache read/write, model, tools, latency, cost) recorded alongside `recordTurnUsage` | A baseline per request, not per turn |
| P1 | Prompt caching + cache-aware pricing; effort `medium`; `ToolCallFilter` on history; add Haiku 5.5 / Opus 5.5 prices | Cache-hit rate, cost per turn, same answers on the 34 questions |
| P2 | Fix tool thrash: fuzzy `find_location` or near-match results on miss | `find_location` calls per turn ≤ 2 |
| P3 | Deterministic paths: prebuilt "what's new" briefing; direct navigation for plain "show me X on the map" | Fewer model calls, latency under 5 s on those |
| P4 | Eval: Haiku 5.5, GPT-6 Luna, Gemini 3.8 Flash, Sonnet 5.5 at low/medium effort on the 34 turns + added cases; grade tool choice, arguments, answer, navigation, latency, billed cost | Pick the cheapest default that passes; keep a named stronger model |
| P5 | Only if P4 shows a split: cheap default + escalation, comparing `ModelSelectionProcessor` with Jev vs a fixed rule vs OpenRouter Jev Router | Deploy routing only on a measured advantage; gated on NRC data-handling |
