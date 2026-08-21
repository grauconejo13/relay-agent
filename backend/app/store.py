from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from .models import (
    HandoffEvent,
    HandoffEventType,
    HandoffStatus,
    Obligation,
    ObligationStatus,
    ShiftHandoff,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class HandoffStore:
    """In-memory state store for the deterministic MVP.

    The interface is deliberately small so Firestore can replace this implementation
    without changing the API or domain transition rules.
    """

    def __init__(self) -> None:
        self._handoffs: dict[UUID, ShiftHandoff] = {}

    def clear(self) -> None:
        self._handoffs.clear()

    def save(self, handoff: ShiftHandoff) -> ShiftHandoff:
        self._handoffs[handoff.id] = handoff
        return handoff

    def get(self, handoff_id: UUID) -> ShiftHandoff | None:
        return self._handoffs.get(handoff_id)

    def list(self) -> list[ShiftHandoff]:
        return sorted(self._handoffs.values(), key=lambda item: item.created_at, reverse=True)

    def add_event(
        self,
        handoff: ShiftHandoff,
        event_type: HandoffEventType,
        message: str,
        *,
        actor: str = "Relay",
        obligation_id: UUID | None = None,
    ) -> None:
        handoff.timeline.append(
            HandoffEvent(
                type=event_type,
                message=message,
                actor=actor,
                obligation_id=obligation_id,
            )
        )
        handoff.updated_at = utcnow()

    def handoff(self, handoff: ShiftHandoff) -> ShiftHandoff:
        if handoff.status != HandoffStatus.DRAFT:
            raise ValueError("Only draft handoffs can be handed off.")
        handoff.status = HandoffStatus.HANDED_OFF
        for obligation in handoff.obligations:
            if obligation.status == ObligationStatus.OPEN:
                obligation.status = ObligationStatus.HANDED_OFF
                obligation.updated_at = utcnow()
        self.add_event(
            handoff,
            HandoffEventType.HANDED_OFF,
            f"Responsibility transferred from {handoff.from_shift} to {handoff.to_shift}.",
        )
        return self.save(handoff)

    def acknowledge(self, handoff: ShiftHandoff, actor: str) -> ShiftHandoff:
        if handoff.status not in {HandoffStatus.HANDED_OFF, HandoffStatus.ACKNOWLEDGED}:
            raise ValueError("Handoff must be transferred before it can be acknowledged.")
        handoff.status = HandoffStatus.ACKNOWLEDGED
        handoff.acknowledged_by = actor
        handoff.acknowledged_at = utcnow()
        for obligation in handoff.obligations:
            if obligation.status == ObligationStatus.HANDED_OFF:
                obligation.status = ObligationStatus.ACKNOWLEDGED
                obligation.updated_at = utcnow()
        self.add_event(
            handoff,
            HandoffEventType.ACKNOWLEDGED,
            f"{actor} acknowledged responsibility for the handoff.",
            actor=actor,
        )
        return self.save(handoff)

    def update_obligation(
        self,
        handoff: ShiftHandoff,
        obligation: Obligation,
        *,
        status: ObligationStatus | None = None,
        owner: str | None = None,
        dependency: str | None = None,
        note: str | None = None,
        actor: str = "Relay",
    ) -> ShiftHandoff:
        if status is not None:
            obligation.status = status
        if owner is not None:
            obligation.owner = owner
        if dependency is not None:
            obligation.dependency = dependency
        obligation.updated_at = utcnow()

        details = note or f"{obligation.title} updated to {obligation.status.value}."
        self.add_event(
            handoff,
            HandoffEventType.OBLIGATION_UPDATED,
            details,
            actor=actor,
            obligation_id=obligation.id,
        )

        if handoff.obligations and all(item.status == ObligationStatus.RESOLVED for item in handoff.obligations):
            handoff.status = HandoffStatus.COMPLETE
            self.add_event(
                handoff,
                HandoffEventType.COMPLETED,
                "All carried obligations are resolved. Continuity loop complete.",
            )

        return self.save(handoff)


store = HandoffStore()
