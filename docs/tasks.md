# Relay Tasks

## Milestone 0 — Foundation

- [x] Initialize repository and working branches.
- [x] Scaffold Next.js + TypeScript frontend.
- [x] Scaffold FastAPI + Python backend.
- [x] Add Google ADK / Firestore / Pub/Sub dependencies as planned integration points.
- [x] Add product, architecture, hackathon, task, and session documentation.
- [ ] Verify frontend install/build locally.
- [ ] Verify backend install/tests locally.

## Milestone 1 — Deterministic Handoff Loop

- [ ] Create demo workspace and Shift A/Shift B fixtures.
- [ ] Accept messy shift notes through the UI/API.
- [ ] Persist a handoff and obligations in local development storage.
- [ ] Support acknowledgement and explicit obligation state transitions.
- [ ] Add an event timeline so every transition is auditable.
- [ ] Add tests for handoff creation and state transitions.

## Milestone 2 — Gemini + ADK

- [ ] Add ADK coordinator agent.
- [ ] Define bounded tools for handoff extraction and obligation updates.
- [ ] Use Gemini to extract candidate obligations, dependencies, uncertainty, and follow-up conditions.
- [ ] Preserve deterministic authority over persisted state.
- [ ] Add graceful model/provider failure states.

## Milestone 3 — Persistent + Async Continuity

- [ ] Add Firestore persistence.
- [ ] Add Pub/Sub event publishing.
- [ ] Add Cloud Run follow-up worker.
- [ ] Demonstrate an unresolved obligation receiving a later simulated external event.
- [ ] Re-evaluate and update the obligation automatically with audit evidence.

## Milestone 4 — Hackathon Demo

- [ ] Polish the operational dashboard.
- [ ] Add the complete Shift A → Shift B demo scenario.
- [ ] Deploy frontend/backend as appropriate.
- [ ] Prove backend execution on Google Cloud.
- [ ] Add architecture diagram.
- [ ] Add Playwright end-to-end demo verification.
- [ ] Complete reproducible setup instructions.
- [ ] Record and trim the ~4-minute demo.
- [ ] Prepare Devpost write-up and bonus social/content post if worthwhile.

## Not Yet

No Slack/Jira/ServiceNow integrations, enterprise agent registry, broad multi-tenant auth, billing, analytics suite, or generalized workflow builder until the core continuity loop is reliable.
