from fastapi.testclient import TestClient

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
