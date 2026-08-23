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

- [x] Create demo workspace and Shift A/Shift B fixtures.
- [x] Accept operational notes through the handoff API and demo control room.
- [x] Maintain handoff and obligation state in an in-memory development store.
- [x] Support transfer, acknowledgement, and explicit obligation state transitions.
- [x] Add an event timeline so every transition is auditable.
- [x] Connect the control-room UI to the lifecycle API.
- [x] Add tests for the complete handoff lifecycle and invalid transition handling.
- [ ] Verify backend lifecycle tests locally.
- [ ] Verify the frontend/backend integrated demo locally.
- [ ] Replace the in-memory store with Firestore in Milestone 3.

## Milestone 2 — Gemini + ADK

- [x] Define a strict candidate-obligation extraction schema.
- [x] Add a bounded intake endpoint that never mutates authoritative handoff state.
- [x] Add deterministic fallback extraction so development continues without credentials.
- [x] Capture dependency, owner, follow-up condition, confidence, and source evidence fields.
- [x] Add tests proving extraction is review-only and does not create handoffs.
- [ ] Add live ADK coordinator agent once Google credentials are configured.
- [ ] Use Gemini to populate the same extraction schema from messy notes.
- [ ] Add UI review/approval for candidate obligations before persistence.
- [ ] Add graceful live-model/provider failure handling and telemetry.

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
