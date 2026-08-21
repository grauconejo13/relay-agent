# Relay

**Autonomous continuity for operational handoffs.**

Relay prevents important work from disappearing when responsibility moves from one person, shift, or team to another. It extracts unresolved obligations from messy operational context, creates an accountable handoff, persists open work, and continues following dependencies after the handoff occurs.

This repository is being built for the **All Things Agentic Hackathon** with an initial Taskmaster-track target.

## Stack

- `frontend/` — Next.js, React, TypeScript
- `backend/` — FastAPI, Python, Google ADK
- Gemini 3.5 Flash via Gemini API or Vertex AI
- Firestore for persistent continuity state
- Pub/Sub for asynchronous follow-up events
- Cloud Run for backend/worker deployment
- Playwright for end-to-end verification later in the build

## Current milestone

The repository is in **Milestone 0: Foundation**. The next implementation target is a deterministic Shift A → Shift B handoff loop before model or cloud behavior is introduced.

See:

- [`docs/vision.md`](docs/vision.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/hackathon.md`](docs/hackathon.md)
- [`docs/tasks.md`](docs/tasks.md)
- [`docs/session-log.md`](docs/session-log.md)

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`.

### Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The backend health endpoint is available at `http://localhost:8000/health`.

## Environment

Copy `.env.example` to your local environment file and fill only the credentials/configuration required by the current milestone. Never commit secrets.

## Scope

The hackathon MVP proves one thing well: **an unresolved operational obligation survives a handoff and receives accountable follow-through.** Real workplace integrations and broad enterprise features are intentionally deferred until that loop works reliably.
