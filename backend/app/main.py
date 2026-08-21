from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    AcknowledgeHandoffRequest,
    CreateHandoffRequest,
    HandoffEvent,
    HandoffEventType,
    Obligation,
    ShiftHandoff,
    UpdateObligationRequest,
)
from .store import store

app = FastAPI(title="Relay API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "relay-backend"}


def get_handoff_or_404(handoff_id: UUID) -> ShiftHandoff:
    handoff = store.get(handoff_id)
    if handoff is None:
        raise HTTPException(status_code=404, detail="Handoff not found")
    return handoff


def get_obligation_or_404(handoff: ShiftHandoff, obligation_id: UUID) -> Obligation:
    obligation = next((item for item in handoff.obligations if item.id == obligation_id), None)
    if obligation is None:
        raise HTTPException(status_code=404, detail="Obligation not found")
    return obligation


@app.get("/api/handoffs", response_model=list[ShiftHandoff])
def list_handoffs() -> list[ShiftHandoff]:
    return store.list()


@app.get("/api/handoffs/{handoff_id}", response_model=ShiftHandoff)
def get_handoff(handoff_id: UUID) -> ShiftHandoff:
    return get_handoff_or_404(handoff_id)


@app.post("/api/handoffs", response_model=ShiftHandoff, status_code=201)
def create_handoff(payload: CreateHandoffRequest) -> ShiftHandoff:
    """Create a deterministic handoff until Gemini/ADK extraction is wired in."""
    obligations = [
        Obligation(
            title=f"Follow up: {note[:60]}",
            summary=note,
            owner="Unassigned",
            source_note=note,
        )
        for note in payload.notes
        if note.strip()
    ]

    handoff = ShiftHandoff(
        from_shift=payload.from_shift,
        to_shift=payload.to_shift,
        obligations=obligations,
    )
    handoff.timeline.append(
        HandoffEvent(
            type=HandoffEventType.CREATED,
            message=f"Relay created a draft with {len(obligations)} open obligation(s).",
        )
    )
    return store.save(handoff)


@app.post("/api/handoffs/{handoff_id}/transfer", response_model=ShiftHandoff)
def transfer_handoff(handoff_id: UUID) -> ShiftHandoff:
    handoff = get_handoff_or_404(handoff_id)
    try:
        return store.handoff(handoff)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.post("/api/handoffs/{handoff_id}/acknowledge", response_model=ShiftHandoff)
def acknowledge_handoff(handoff_id: UUID, payload: AcknowledgeHandoffRequest) -> ShiftHandoff:
    handoff = get_handoff_or_404(handoff_id)
    try:
        return store.acknowledge(handoff, payload.actor)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.patch("/api/handoffs/{handoff_id}/obligations/{obligation_id}", response_model=ShiftHandoff)
def update_obligation(
    handoff_id: UUID,
    obligation_id: UUID,
    payload: UpdateObligationRequest,
) -> ShiftHandoff:
    handoff = get_handoff_or_404(handoff_id)
    obligation = get_obligation_or_404(handoff, obligation_id)
    return store.update_obligation(
        handoff,
        obligation,
        status=payload.status,
        owner=payload.owner,
        dependency=payload.dependency,
        note=payload.note,
        actor=payload.actor,
    )
