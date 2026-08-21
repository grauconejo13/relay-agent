from fastapi import FastAPI

from .models import CreateHandoffRequest, Obligation, ObligationStatus, ShiftHandoff

app = FastAPI(title="Relay API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "relay-backend"}


@app.post("/api/handoffs", response_model=ShiftHandoff)
def create_demo_handoff(payload: CreateHandoffRequest) -> ShiftHandoff:
    """Create a deterministic demo handoff until the ADK extraction agent is wired in."""
    obligations = [
        Obligation(
            title=f"Follow up: {note[:60]}",
            summary=note,
            owner="Unassigned",
            status=ObligationStatus.OPEN,
            source_note=note,
        )
        for note in payload.notes
        if note.strip()
    ]

    return ShiftHandoff(
        from_shift=payload.from_shift,
        to_shift=payload.to_shift,
        obligations=obligations,
    )
