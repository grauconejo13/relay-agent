# All Things Agentic Hackathon

## Submission target

- Deadline: August 31, 2026
- Planned track: Taskmaster
- Project: Relay

## Required stack constraints

Relay must use:

- Gemini 3.5 or newer through Gemini API or Vertex AI
- At least one Google agent framework; Relay will use Google ADK
- At least one Google Cloud infrastructure service; Relay plans Cloud Run, Firestore, and Pub/Sub

## Judging alignment

### Innovation & Operational Utility — 40%

Relay should visibly remove handoff friction with autonomous follow-through, not merely summarize notes.

### Architectural Discipline & Tech Stack — 30%

The demo and repository should make state, memory, tool boundaries, asynchronous execution, credentials, failure states, and audit history easy to inspect.

### Demo & Production Readiness — 30%

The final submission should include a reproducible README, architecture diagram, approximately four-minute demo, hosted UI if practical, and visible proof of Google Cloud deployment.

## Demo promise

A judge should be able to watch one unresolved operational obligation survive a shift change, receive an asynchronous update, and remain accountable through the next state transition.

## Scope guardrail

Do not add enterprise fleet features, real workplace integrations, broad analytics, or unrelated agent personas before the core handoff loop works end to end.
