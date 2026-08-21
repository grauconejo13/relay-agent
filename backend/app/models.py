from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ObligationStatus(StrEnum):
    OPEN = "open"
    WAITING = "waiting"
    BLOCKED = "blocked"
    RESOLVED = "resolved"


class Obligation(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    summary: str
    owner: str
    status: ObligationStatus = ObligationStatus.OPEN
    dependency: str | None = None
    due_at: datetime | None = None
    source_note: str | None = None


class ShiftHandoff(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    from_shift: str
    to_shift: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    obligations: list[Obligation] = Field(default_factory=list)
    acknowledged_by: str | None = None


class CreateHandoffRequest(BaseModel):
    from_shift: str
    to_shift: str
    notes: list[str] = Field(default_factory=list)
