---
status: accepted
---

# One CLEAR Agent; NRC Find is a tool, and Threads are stored Conversations

Supersedes [ADR-0001](0001-agent-is-a-stateless-rag-thread.md).

The `/agent` page was a chat with **NRC Find**, which is a document search plus a summariser
(a self-hosted RAG chain over NRC's documents, answered by an open-weight model on NRC's
infrastructure) with no tools, memory or planning. When we added a tool-using **CLEAR Agent**
(Mastra) over CLEAR's live data, we first planned to offer both Agents side by side in the
**Agent drawer**. We merged them instead: there is **one CLEAR Agent**, and NRC Find is one of
its tools. The overlap between the two was the chat layer, not the intelligence. Two Agents
meant two front ends, an Agent picker, and users guessing which one to ask. One Agent can also
answer a single question from NRC's documents and CLEAR's data together.

Every **Thread** is now the view of a **Conversation** stored in clear-api. NRC Find itself
stays stateless. The CLEAR Agent holds the conversation and rewrites each follow-up into a
complete question before consulting NRC Find, which fixes the "vague follow-ups miss"
weakness ADR-0001 accepted.

## Considered options

- **Two Agents in the drawer (Find Agent + CLEAR Agent).** Rejected for the reasons above.
  It was briefly accepted before the merge, so the glossary lists "Find Agent" under _Avoid_.
- **Keep the NRC Find chat unchanged beside the new Agent.** Leaves a Find-only page that
  ignores stored history and can't use CLEAR data.

## Consequences

- What people liked about NRC Find, its open-weight self-hosted model, becomes a *model
  choice* for the CLEAR Agent, not a separate product. The model is configurable and stays
  undecided until NRC says whether self-hosting is a hard data rule or a preference. If it's
  a rule, NRC Find's single T4 GPU is not enough to run a multi-step tool-using Agent.
- NRC Find's API only returns finished answers, so the Agent chains two models (NRC Find's
  and its own) until nrc-find offers a search-only endpoint.
- Pending users lose the NRC Find access they had. The CLEAR Agent is offered to approved
  users only.
