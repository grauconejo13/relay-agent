from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ObligationStatus(StrEnum):
    OPEN = "open"
    HANDED_OFF = "handed_off"
    ACKNOWLEDGED = "acknowledged"
    WAITING = "waiting"
    BLOCKED = "blocked"
    RESOLVED = "resolved"


class HandoffStatus(StrEnum):
    DRAFT = "draft"
    HANDED_OFF = "handed_off"
    ACKNOWLEDGED = "acknowledged"
    COMPLETE = "complete"


class HandoffEventType(StrEnum):
    CREATED = "created"
    HANDED_OFF = "handed_off"
    ACKNOWLEDGED = "acknowledged"
    OBLIGATION_UPDATED = "obligation_updated"
    COMPLETED = "completed"


class HandoffEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: HandoffEventType
    message: str
    actor: str = "Relay"
    obligation_id: UUID | None = None
    created_at: datetime = Field(default_factory=utcnow)


class Obligation(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    summary: str
    owner: str
    status: ObligationStatus = ObligationStatus.OPEN
    dependency: str | None = None
    due_at: datetime | None = None
    source_note: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ShiftHandoff(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    from_shift: str
    to_shift: str
    status: HandoffStatus = HandoffStatus.DRAFT
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    obligations: list[Obligation] = Field(default_factory=list)
    timeline: list[HandoffEvent] = Field(default_factory=list)
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None


class CreateHandoffRequest(BaseModel):
    from_shift: str
    to_shift: str
    notes: list[str] = Field(default_factory=list)


class AcknowledgeHandoffRequest(BaseModel):
    actor: str = Field(min_length=1)


class UpdateObligationRequest(BaseModel):
    status: ObligationStatus | None = None
    owner: str | None = None
    dependency: str | None = None
    note: str | None = None
    actor: str = "Relay"
