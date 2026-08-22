from __future__ import annotations

import re
from dataclasses import dataclass

from pydantic import BaseModel, Field

from .config import settings


class CandidateObligation(BaseModel):
    title: str
    summary: str
    owner: str | None = None
    dependency: str | None = None
    follow_up_condition: str | None = None
    confidence: float = Field(ge=0, le=1)
    source_note: str


class IntakeResult(BaseModel):
    mode: str
    candidates: list[CandidateObligation]
    warnings: list[str] = Field(default_factory=list)


class IntakeRequest(BaseModel):
    notes: list[str] = Field(default_factory=list)


class IntakeStatus(BaseModel):
    requested_mode: str
    active_mode: str
    model: str
    ready_for_live_model: bool
    warnings: list[str] = Field(default_factory=list)


@dataclass
class IntakeExtractor:
    """Bounded extraction boundary for Gemini/ADK.

    Gemini is allowed to produce review candidates only. It does not mutate
    Relay's deterministic handoff source of truth.
    """

    def status(self) -> IntakeStatus:
        warnings = settings.live_readiness_warnings()
        ready = settings.has_model_auth
        active_mode = "gemini" if settings.live_intake_requested and ready else "fallback"
        if settings.live_intake_requested and ready:
            warnings.append("Gemini credentials detected; live ADK execution will be enabled during credential verification.")
        return IntakeStatus(
            requested_mode=settings.intake_mode,
            active_mode=active_mode,
            model=settings.gemini_model,
            ready_for_live_model=ready,
            warnings=warnings,
        )

    def extract(self, notes: list[str]) -> IntakeResult:
        cleaned = [note.strip() for note in notes if note.strip()]
        if not cleaned:
            return IntakeResult(mode="fallback", candidates=[], warnings=["No operational notes supplied."])

        # The ADK agent is scaffolded in app/agent.py. Until credentials are
        # verified locally, keep this HTTP path deterministic and safe.
        warnings = ["Deterministic extraction used; live Gemini execution is not enabled yet."]
        warnings.extend(settings.live_readiness_warnings())
        return IntakeResult(
            mode="fallback",
            candidates=[self._fallback_candidate(note) for note in cleaned],
            warnings=warnings,
        )

    def _fallback_candidate(self, note: str) -> CandidateObligation:
        owner = self._extract_owner(note)
        dependency = self._extract_dependency(note)
        follow_up = self._extract_follow_up(note)
        title = note.split(".", 1)[0].strip()
        if len(title) > 72:
            title = f"{title[:69]}..."

        return CandidateObligation(
            title=title or "Operational follow-up",
            summary=note,
            owner=owner,
            dependency=dependency,
            follow_up_condition=follow_up,
            confidence=0.55,
            source_note=note,
        )

    @staticmethod
    def _extract_owner(note: str) -> str | None:
        patterns = [
            r"(?:owner|assigned to|follow(?:ing)? up)[:\s]+([A-Z][A-Za-z0-9_-]+)",
            r"([A-Z][A-Za-z0-9_-]+) is following up",
        ]
        for pattern in patterns:
            match = re.search(pattern, note, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def _extract_dependency(note: str) -> str | None:
        match = re.search(r"(?:waiting (?:on|for)|depends on|pending)\s+([^.;]+)", note, re.IGNORECASE)
        return match.group(1).strip() if match else None

    @staticmethod
    def _extract_follow_up(note: str) -> str | None:
        match = re.search(r"(?:expected|due|by)\s+([^.;]+)", note, re.IGNORECASE)
        return f"Check status {match.group(0).strip()}" if match else None


extractor = IntakeExtractor()
