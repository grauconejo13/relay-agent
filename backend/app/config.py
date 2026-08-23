from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class RelaySettings:
    intake_mode: str = os.getenv("RELAY_INTAKE_MODE", "fallback").lower()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    google_cloud_project: str | None = os.getenv("GOOGLE_CLOUD_PROJECT") or None
    google_cloud_location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or None

    @property
    def live_intake_requested(self) -> bool:
        return self.intake_mode == "gemini"

    @property
    def has_model_auth(self) -> bool:
        return bool(self.gemini_api_key or self.google_cloud_project)

    def live_readiness_warnings(self) -> list[str]:
        warnings: list[str] = []
        if self.intake_mode not in {"fallback", "gemini"}:
            warnings.append("RELAY_INTAKE_MODE must be either 'fallback' or 'gemini'.")
        if self.live_intake_requested and not self.has_model_auth:
            warnings.append(
                "Gemini mode is enabled but no GEMINI_API_KEY/GOOGLE_API_KEY or GOOGLE_CLOUD_PROJECT is configured."
            )
        return warnings


settings = RelaySettings()
