from __future__ import annotations

import os
import re
from dataclasses import dataclass

from pydantic import BaseModel, Field


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


@dataclass
class IntakeExtractor:
    """Bounded extraction boundary for Gemini/ADK.

    Live Gemini execution is intentionally isolated behind this class so the
    deterministic handoff state machine never depends on model availability.
    """

    model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

    def extract(self, notes: list[str]) -> IntakeResult:
        cleaned = [note.strip() for note in notes if note.strip()]
        if not cleaned:
            return IntakeResult(mode="fallback", candidates=[], warnings=["No operational notes supplied."])

        # Until credentials are configured, use a deterministic extractor that
        # preserves the same output contract the ADK agent will produce.
        return IntakeResult(
            mode="fallback",
            candidates=[self._fallback_candidate(note) for note in cleaned],
            warnings=["Gemini intake is not configured; deterministic extraction used."],
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
