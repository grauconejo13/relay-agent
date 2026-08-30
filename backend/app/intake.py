from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from uuid import uuid4

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
        ready = self._live_execution_enabled()
        active_mode = "gemini" if ready else "fallback"
        if settings.live_intake_requested and settings.has_model_auth and not ready:
            warnings.append("Gemini mode was requested, but the Google ADK runtime is unavailable.")
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

        if self._live_execution_enabled():
            try:
                raw_response = self._execute_gemini(cleaned)
                return IntakeResult(
                    mode="gemini",
                    candidates=self._parse_gemini_response(raw_response, cleaned),
                )
            except Exception as error:
                return self._fallback_result(
                    cleaned,
                    f"Gemini extraction failed ({self._safe_error(error)}); deterministic extraction was used.",
                )

        warnings = ["Deterministic extraction used; Gemini live execution is not enabled."]
        warnings.extend(settings.live_readiness_warnings())
        return IntakeResult(
            mode="fallback",
            candidates=[self._fallback_candidate(note) for note in cleaned],
            warnings=warnings,
        )

    def _fallback_result(self, notes: list[str], warning: str) -> IntakeResult:
        return IntakeResult(
            mode="fallback",
            candidates=[self._fallback_candidate(note) for note in notes],
            warnings=[warning],
        )

    @staticmethod
    def _safe_error(error: Exception) -> str:
        """Avoid leaking credentials or provider response bodies through the API."""
        return type(error).__name__

    @staticmethod
    def _live_execution_enabled() -> bool:
        if not (settings.live_intake_requested and settings.has_model_auth):
            return False
        try:
            from google.adk.runners import Runner  # noqa: F401
            from google.adk.sessions import InMemorySessionService  # noqa: F401
            from google.genai import types  # noqa: F401
            from .agent import app  # noqa: F401
        except Exception:
            return False
        return True

    def _execute_gemini(self, notes: list[str]) -> str:
        """Run the existing ADK App in a short-lived, isolated session.

        The Runner is ADK's supported production execution interface. A new
        in-memory session prevents this review-only endpoint from carrying or
        changing authoritative Relay state between requests.
        """
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types

        from .agent import app

        async def run() -> str:
            session_service = InMemorySessionService()
            runner = Runner(app=app, session_service=session_service)
            session = await session_service.create_session(
                app_name=app.name,
                user_id="relay-intake-api",
                session_id=str(uuid4()),
            )
            prompt = "Extract review candidates from these operational notes:\n\n" + "\n\n".join(
                f"NOTE {index + 1}: {note}" for index, note in enumerate(notes)
            )
            last_text = ""
            async for event in runner.run_async(
                user_id=session.user_id,
                session_id=session.id,
                new_message=types.Content(role="user", parts=[types.Part(text=prompt)]),
            ):
                if event.error_message:
                    raise RuntimeError(event.error_message)
                if event.content and event.content.parts:
                    text = "".join(part.text or "" for part in event.content.parts)
                    if text:
                        last_text = text
            if not last_text:
                raise ValueError("ADK returned no text response")
            return last_text

        return asyncio.run(asyncio.wait_for(run(), timeout=30))

    @staticmethod
    def _parse_gemini_response(raw_response: str, source_notes: list[str]) -> list[CandidateObligation]:
        payload = raw_response.strip()
        if payload.startswith("```"):
            payload = re.sub(r"^```(?:json)?\s*|\s*```$", "", payload, flags=re.IGNORECASE)
        decoded = json.loads(payload)
        if not isinstance(decoded, dict) or not isinstance(decoded.get("candidates"), list):
            raise ValueError("Gemini response does not contain a candidates list")

        candidates = [CandidateObligation.model_validate(item) for item in decoded["candidates"]]
        for candidate in candidates:
            # Model output must point back to unmodified source evidence supplied
            # by this request; inferred or invented evidence is rejected.
            if candidate.source_note not in source_notes:
                raise ValueError("Gemini candidate source_note is not an incoming note")
        return candidates

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
