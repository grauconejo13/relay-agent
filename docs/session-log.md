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
