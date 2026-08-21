# Relay Architecture

## Target stack

- Frontend: Next.js + React + TypeScript
- API: FastAPI + Python
- Agent framework: Google ADK
- Model: Gemini 3.5 Flash via Vertex AI or Gemini API
- Persistent state: Firestore
- Async events: Pub/Sub
- Runtime: Cloud Run
- End-to-end verification: Playwright

## Runtime flow

```text
Next.js UI
   |
   v
FastAPI / Relay API
   |
   v
Google ADK coordinator -----> Gemini
   |
   +----> handoff extraction tool
   +----> obligation state tool
   +----> simulated operations tools
   |
   +----> Firestore (persistent continuity state)
   |
   +----> Pub/Sub (follow-up events)
                |
                v
          Cloud Run worker
                |
                v
       obligation re-evaluation
```

## Agent boundary

Gemini may interpret messy notes, infer candidate obligations, identify uncertainty, and propose next actions. Deterministic application code remains authoritative for IDs, state transitions, acknowledgements, deadlines, event delivery, and persisted audit history.

## MVP tools

The first demo will use simulated operational systems rather than external Slack/Jira/ServiceNow integrations. Tool contracts should still resemble real integrations so later adapters can replace the fixtures without redesigning the agent.

## Failure behavior

Relay should fail visibly. Missing context becomes an unresolved question; unavailable tools become a blocked dependency; failed model calls must not silently mark obligations resolved. Every autonomous action should produce an auditable event.
