from fastapi.testclient import TestClient

from app import intake
from app.config import RelaySettings
from app.intake import extractor
from app.main import app

client = TestClient(app)


def test_intake_status_is_safe_before_credentials_are_configured() -> None:
    response = client.get("/api/intake/status")
    assert response.status_code == 200

    payload = response.json()
    assert payload["requested_mode"] in {"fallback", "gemini"}
    assert payload["active_mode"] in {"fallback", "gemini"}
    assert payload["model"]
    assert isinstance(payload["ready_for_live_model"], bool)
    assert isinstance(payload["warnings"], list)


def test_intake_status_reports_live_execution_when_it_is_enabled(monkeypatch) -> None:
    monkeypatch.setattr(intake, "settings", RelaySettings(intake_mode="gemini", gemini_api_key="test-key"))
    monkeypatch.setattr(extractor, "_live_execution_enabled", lambda: True)

    response = client.get("/api/intake/status")

    assert response.status_code == 200
    assert response.json()["active_mode"] == "gemini"
    assert response.json()["ready_for_live_model"] is True
