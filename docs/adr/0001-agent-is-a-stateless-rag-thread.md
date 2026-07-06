---
status: accepted (provisional — revisit with the upcoming agent/conversation architecture work)
---

# Agent chat is a stateless RAG thread

## Context

The `/agent` page presents a chat-style **Thread** of question/Answer turns. The only
backend behind it today is **NRC Find** (`POST /api/v1/rag/answers`), which is stateless:
it takes a single `prompt` and returns one Answer plus Source documents, with no notion of
a conversation. CLEAR also has no conversation/message store of its own (it is a BFF that
owns no domain data).

## Decision

The Thread is a **UI-only** construct. Each question is sent to NRC Find as an independent
call; prior turns are **not** replayed to the backend, and follow-ups carry no server-side
context. The Thread is persisted client-side (localStorage) purely so the user's own view
survives a reload.

This is a provisional decision made under current constraints, not a long-term stance — we
expect to revisit it (see below).

## Considered options

- **Stuff prior turns into the `prompt`.** Rejected for now: it pollutes the retrieval query
  and degrades NRC Find's document matching — the cost lands exactly where the product's
  value is.
- **Server-side conversations with real history.** Rejected for now: needs a conversation
  store and a multi-turn-aware backend contract that neither CLEAR nor the NRC Find
  `rag/answers` endpoint currently provides.

## Consequences

- Vague follow-ups ("tell me more", "and in Lebanon?") retrieve against only their own
  words, so they will often miss. This is expected behaviour, not a bug.
- Because there is no shared backend memory, the localStorage Thread on one device is the
  *only* record of a conversation.

## Revisit when

Broader agent/conversation architecture changes are anticipated. When a stateful
conversation backend (or a multi-turn NRC Find contract) lands, reopen this: the UI Thread
should become the front of a real, server-backed conversation rather than a client-only
list. Treat this ADR as the marker for that future work.
