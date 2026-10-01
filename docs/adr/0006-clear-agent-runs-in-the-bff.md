---
status: accepted
---

# The CLEAR Agent runs inside this app's server until something else needs to call it

This app is a BFF that owns no domain data, yet the **CLEAR Agent** (Mastra) runs inside its
server, in a route handler. It does not run in a separate agent service or in clear-api. We
chose this because the BFF already holds the user's session and forwards it to clear-api on
every call, so the Agent acts as the user with no new credentials. **Agent navigation** also
has to act on the user's screen, so the Agent's stream would pass through this app anyway.
And it adds no deployable: the app runs as a long-lived container on our VMs, not serverless.
The Agent stores nothing here; Conversations live in clear-api.

**Rule:** the CLEAR Agent moves to its own service the first time anything other than this
app needs to call it, for example an analyst-facing Slack or Teams front end.

## Considered options

- **A separate Mastra service now.** Lets other front ends share the Agent, but costs a new
  deployable and brings back the problem of passing the user's credential between services,
  for callers that don't exist yet.
- **Inside clear-api.** Puts LLM calls, prompts and model spend in the system of record, which
  clear-mcp's ADR-0001 deliberately kept out.

## Consequences

- Backend-triggered Agents are **different Agents** with different identities and tools, and
  never live here. Examples are signal enrichment as signals arrive, or any future hotline
  bot. clear-api must never call this app.
- Extracting the Agent later means relocating one module and leaving a proxy behind.
