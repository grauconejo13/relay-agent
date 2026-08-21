from fastapi.testclient import TestClient

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
