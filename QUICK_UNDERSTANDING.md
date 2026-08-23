# Relay Agent — Quick Understanding

> A short study sheet for understanding the project without rereading the whole repository.

## What it does

Relay Agent turns messy operational notes into structured handoff obligations and keeps those obligations accountable across a shift change. The important idea is not merely extracting tasks with AI: Relay separates **AI interpretation** from the **authoritative workflow state** that decides what is actually tracked.

## Architecture in one minute

- **Frontend:** the operator/control-room interface. It shows handoffs, timelines, and AI-generated candidate obligations for human review.
- **FastAPI backend:** owns the API and deterministic handoff lifecycle.
- **Gemini / ADK layer:** interprets messy notes and proposes structured candidate obligations. It should not directly mutate authoritative workflow state.
- **Persistence / async layer:** Firestore + Pub/Sub / worker continuity is the upcoming milestone for durable state and later follow-up events.

Think of it as:

`messy notes → Gemini proposes → human/app validates → deterministic state machine owns → later event updates obligation`

## Core data flow

1. An operator submits messy shift notes.
2. The intake endpoint extracts one or more candidate obligations.
3. Gemini/ADK is intended to produce a strict structured result; deterministic fallback keeps development/test behavior available when live AI is unavailable.
4. The review UI presents candidates rather than silently creating authoritative work.
5. A human can inspect/edit/approve/reject a candidate.
6. Approved obligations enter the deterministic handoff lifecycle.
7. The lifecycle records state transitions and audit history.
8. The upcoming cloud milestone persists that state and lets asynchronous events trigger reevaluation later.

## The most important boundary

**Gemini is an interpreter, not the source of truth.**

The model may suggest:

- what the obligation is,
- who appears to own it,
- dependencies,
- follow-up conditions,
- evidence,
- confidence.

The deterministic application layer decides what becomes authoritative and how its lifecycle changes. This boundary reduces the risk of model output silently corrupting operational state.

## State: what lives where?

### Current / prototype

The deterministic backend owns the handoff lifecycle and audit timeline. The candidate-review UI is a human-review boundary and should not be treated as authoritative persistence by itself.

### Target

Firestore will provide durable obligation state. Pub/Sub plus a follow-up worker will allow a later event to arrive after the original shift and cause the relevant obligation to be reevaluated.

## Why the async milestone matters

Without asynchronous continuity, Relay is mostly an AI task extractor plus workflow UI. The stronger demo is:

`Shift A creates unresolved obligation → Shift B inherits it → later event arrives → Relay reevaluates it → audit trail shows what changed`

That demonstrates the actual handoff-continuity problem the project is trying to solve.

## Failure points to understand

1. **Gemini unavailable or malformed output** — the application must fail safely or use the bounded deterministic fallback rather than accepting arbitrary output.
2. **Incorrect extraction** — candidate review exists so a model suggestion is not automatically authoritative.
3. **Invalid lifecycle transition** — deterministic state rules should reject transitions that do not make sense.
4. **Persistence failure** — once Firestore is introduced, writes and reads must fail visibly rather than pretending state was saved.
5. **Duplicate/out-of-order async events** — later worker processing needs idempotent behavior and clear audit history.

## Why this architecture?

A fully agentic design could let an LLM decide and mutate everything, but that makes operational state difficult to trust and debug. Relay intentionally uses AI where ambiguity exists — interpreting human notes — and deterministic code where correctness and accountability matter — workflow state and transitions.

That makes the AI visible without making the system dependent on model improvisation for every action.

## Current milestone

**Stage:** BUILDING

**Current focus:** Gemini / ADK intake + human candidate review.

**Next unlock:** prove live Gemini execution against the strict candidate schema and exercise it through the review UI.

**After that:** Firestore persistence → Pub/Sub/worker continuity → deployed end-to-end demo → submission packaging.

Progress percentages are planning estimates, not automatically derived from GitHub yet.

## Build / Ship / Understand

Use three separate questions when judging this repo:

- **BUILD:** Does the feature exist?
- **SHIP:** Is it tested, deployed, demonstrable, and submission-ready?
- **UNDERSTAND:** Can I explain why it works this way and debug it when it fails?

A project can score high on BUILD while still needing work on SHIP or UNDERSTAND.

## Can I explain this myself?

Before calling Relay one of my strong projects, I should be able to answer these without reading the implementation line-by-line:

1. Why doesn't Gemini directly create authoritative handoff state?
2. What happens from submitting messy notes to approving an obligation?
3. What owns the lifecycle state?
4. Why is deterministic fallback useful?
5. What will Firestore add that the current prototype does not have?
6. Why does Relay need Pub/Sub / asynchronous processing?
7. What should happen if Gemini returns invalid structured output?
8. How would I prevent a duplicate later event from changing an obligation twice?
9. What is the difference between an AI candidate and an authoritative obligation?
10. What single end-to-end story should the hackathon demo prove?

If any answer is fuzzy, that is the next part of the repo to study — not necessarily the next feature to build.
