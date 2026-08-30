from fastapi.testclient import TestClient

from app import intake
from app.config import RelaySettings
from app.intake import extractor
from app.main import app

client = TestClient(app)


def test_intake_returns_reviewable_candidates_without_mutation():
    response = client.post(
        "/api/intake/extract",
        json={
            "notes": [
                "Conveyor 14 sensor failed. Maintenance is following up. Waiting for replacement sensor expected 10 PM."
            ]
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "fallback"
    assert len(payload["candidates"]) == 1

    candidate = payload["candidates"][0]
    assert candidate["summary"].startswith("Conveyor 14 sensor failed")
    assert candidate["dependency"] == "replacement sensor expected 10 PM"
    assert candidate["confidence"] == 0.55

    handoffs = client.get("/api/handoffs")
    assert handoffs.status_code == 200
    assert handoffs.json() == []


def test_intake_ignores_blank_notes():
    response = client.post("/api/intake/extract", json={"notes": ["", "   "]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["candidates"] == []
    assert "No operational notes supplied." in payload["warnings"]


def test_gemini_mode_returns_model_candidates(monkeypatch):
    note = "Maya must confirm the vendor delivery before the 10 PM cutover."
    monkeypatch.setattr(intake, "settings", RelaySettings(intake_mode="gemini", gemini_api_key="test-key"))
    monkeypatch.setattr(extractor, "_live_execution_enabled", lambda: True)
    monkeypatch.setattr(
        extractor,
        "_execute_gemini",
        lambda notes: '{"candidates":[{"title":"Confirm vendor delivery","summary":"Confirm vendor delivery before cutover.","owner":"Maya","dependency":"vendor delivery","follow_up_condition":"before the 10 PM cutover","confidence":0.91,"source_note":"Maya must confirm the vendor delivery before the 10 PM cutover."}]}',
    )

    response = client.post("/api/intake/extract", json={"notes": [note]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "gemini"
    assert payload["warnings"] == []
    assert payload["candidates"][0]["owner"] == "Maya"
    assert payload["candidates"][0]["source_note"] == note


def test_gemini_failure_falls_back_deterministically(monkeypatch):
    note = "Maintenance is waiting for a replacement sensor."
    monkeypatch.setattr(intake, "settings", RelaySettings(intake_mode="gemini", gemini_api_key="test-key"))
    monkeypatch.setattr(extractor, "_live_execution_enabled", lambda: True)
    monkeypatch.setattr(extractor, "_execute_gemini", lambda notes: (_ for _ in ()).throw(RuntimeError()))

    response = client.post("/api/intake/extract", json={"notes": [note]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "fallback"
    assert payload["candidates"][0]["summary"] == note
    assert "Gemini extraction failed (RuntimeError)" in payload["warnings"][0]


def test_explicit_fallback_mode_does_not_execute_gemini(monkeypatch):
    monkeypatch.setattr(intake, "settings", RelaySettings(intake_mode="fallback"))
    monkeypatch.setattr(extractor, "_live_execution_enabled", lambda: False)
    monkeypatch.setattr(extractor, "_execute_gemini", lambda notes: (_ for _ in ()).throw(AssertionError()))

    response = client.post("/api/intake/extract", json={"notes": ["Jordan is following up."]})

    assert response.status_code == 200
    assert response.json()["mode"] == "fallback"
