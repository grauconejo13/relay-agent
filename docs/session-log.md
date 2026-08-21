# Hackathon Session Log

Use this file to preserve the build story, major decisions, experiments, and evidence that may matter for the final submission.

## Session 001 — 2026-08-21

### Goal

Initialize Relay for the All Things Agentic Hackathon and establish the smallest architecture that can support a real autonomous handoff loop.

### Decisions

- Project name: Relay.
- Initial track target: Taskmaster.
- Product thesis: continuity management, not summarization.
- First domain: operations shift handoff.
- Frontend: Next.js + TypeScript.
- Backend: FastAPI + Python.
- Agent framework: Google ADK.
- Model target: Gemini 3.5 Flash.
- Google Cloud targets: Cloud Run, Firestore, Pub/Sub.
- External workplace integrations are deferred; the MVP will use realistic simulated operational systems.
- Deterministic application code owns state transitions; model output is advisory/interpretive until explicitly validated and persisted.

### Initial demo scenario

Shift A reports several open issues, including a conveyor sensor awaiting a replacement part. Relay extracts the obligation, assigns/records ownership and dependencies, produces the Shift B handoff, and persists it. Later, a simulated inventory or maintenance event reports whether the part arrived. Relay follows the unresolved obligation and updates the continuity record instead of dropping it after the handoff.

### Evidence to preserve

- Commit history and PRs for hackathon-period implementation.
- Cloud Run deployment evidence.
- ADK/Gemini runtime traces that are safe to include.
- Firestore/Pub/Sub screenshots or logs for the demo.
- Playwright end-to-end verification results.
- Architecture diagram and final demo script.

### Next session

Build the deterministic local handoff loop before introducing Gemini or cloud state.

## Session 002 — 2026-08-21

### Goal

Implement the first real continuity loop while Gemini credentials are not yet available locally.

### Built

- In-memory handoff store designed behind a narrow interface for a later Firestore replacement.
- Explicit handoff lifecycle: draft → handed off → acknowledged → complete.
- Explicit obligation lifecycle including open, handed off, acknowledged, waiting, blocked, and resolved states.
- API endpoints to create, list, transfer, acknowledge, and update handoffs/obligations.
- Audit timeline for creation, transfer, acknowledgement, obligation updates, and completion.
- Control-room UI connected to the FastAPI lifecycle API.
- Three simulated connected operational sources and a three-obligation Shift A → Shift B demo fixture.
- Backend regression coverage for the full lifecycle and invalid acknowledgement-before-transfer behavior.

### Architecture decision

The first implementation uses process memory, not Firestore. This is intentional: the state machine and API contract can now be tested independently before cloud persistence and Gemini are introduced. Firestore will replace the store implementation rather than changing domain transition rules.

### Local verification still required

The work was written through the GitHub integration while the development machine was unavailable. Frontend install/build, backend tests, and the integrated browser flow must be run locally before this milestone is treated as verified.

### Next session

Run local verification, fix any integration defects, then start the ADK/Gemini extraction layer without giving the model authority over state transitions.

## Session 003 — 2026-08-21

### Goal

Create the Gemini intake boundary before live Google credentials are available.

### Built

- Strict candidate-obligation extraction schema with owner, dependency, follow-up condition, confidence, and source evidence.
- `/api/intake/extract` endpoint for review-only extraction.
- Deterministic fallback extractor that follows the same response contract intended for Gemini.
- Tests proving extraction does not create or mutate handoff state.

### Architecture decision

AI extraction is separated from persistence. Gemini/ADK will produce candidates only; deterministic application code remains responsible for accepting candidates and mutating handoff state. This preserves auditability and makes provider failure non-destructive.

### Next session

Configure Google credentials, replace the fallback path with a live ADK/Gemini implementation behind the same contract, then add candidate review/approval in the control-room UI.
