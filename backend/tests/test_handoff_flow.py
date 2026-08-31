from fastapi.testclient import TestClient

from app.main import app
from app.store import store

client = TestClient(app)


def setup_function() -> None:
    store.clear()


def test_complete_handoff_lifecycle() -> None:
    created = client.post(
        "/api/handoffs",
        json={
            "from_shift": "Shift A",
            "to_shift": "Shift B",
            "notes": [
                "Conveyor 14 needs a replacement sensor.",
                "Carrier Northstar needs an updated arrival time.",
            ],
        },
    )
    assert created.status_code == 201
    handoff = created.json()
    assert handoff["status"] == "draft"
    assert len(handoff["obligations"]) == 2
    assert handoff["timeline"][0]["type"] == "created"

    transferred = client.post(f"/api/handoffs/{handoff['id']}/transfer")
    assert transferred.status_code == 200
    handoff = transferred.json()
    assert handoff["status"] == "handed_off"
    assert {item["status"] for item in handoff["obligations"]} == {"handed_off"}

    acknowledged = client.post(
        f"/api/handoffs/{handoff['id']}/acknowledge",
        json={"actor": "Shift B lead"},
    )
    assert acknowledged.status_code == 200
    handoff = acknowledged.json()
    assert handoff["status"] == "acknowledged"
    assert handoff["acknowledged_by"] == "Shift B lead"
    assert {item["status"] for item in handoff["obligations"]} == {"acknowledged"}

    for obligation in handoff["obligations"]:
        updated = client.patch(
            f"/api/handoffs/{handoff['id']}/obligations/{obligation['id']}",
            json={
                "status": "resolved",
                "actor": "Shift B lead",
                "note": "Verified and resolved by the incoming shift.",
            },
        )
        assert updated.status_code == 200
        handoff = updated.json()

    assert handoff["status"] == "complete"
    assert {item["status"] for item in handoff["obligations"]} == {"resolved"}
    assert handoff["timeline"][-1]["type"] == "completed"


def test_handoff_uses_human_reviewed_obligation_fields() -> None:
    response = client.post(
        "/api/handoffs",
        json={
            "from_shift": "Shift A",
            "to_shift": "Shift B",
            "notes": ["This legacy note must not be used."],
            "obligations": [
                {
                    "title": "Confirm revised carrier ETA",
                    "summary": "Outbound must confirm the revised Northstar arrival time.",
                    "owner": "Jordan",
                    "dependency": "Northstar dispatch",
                    "follow_up_condition": "Before trailer assignment",
                    "source_note": "Carrier Northstar is running late.",
                }
            ],
        },
    )

    assert response.status_code == 201
    obligation = response.json()["obligations"][0]
    assert obligation["title"] == "Confirm revised carrier ETA"
    assert obligation["summary"] == "Outbound must confirm the revised Northstar arrival time."
    assert obligation["owner"] == "Jordan"
    assert obligation["dependency"] == "Northstar dispatch"
    assert obligation["follow_up_condition"] == "Before trailer assignment"
    assert obligation["source_note"] == "Carrier Northstar is running late."


def test_draft_obligation_cannot_be_resolved() -> None:
    created = client.post(
        "/api/handoffs",
        json={"from_shift": "Shift A", "to_shift": "Shift B", "notes": ["Open incident"]},
    ).json()

    response = client.patch(
        f"/api/handoffs/{created['id']}/obligations/{created['obligations'][0]['id']}",
        json={"status": "resolved", "actor": "Shift B lead"},
    )

    assert response.status_code == 409
    assert "acknowledged" in response.json()["detail"].lower()


def test_acknowledgement_before_transfer_is_rejected() -> None:
    created = client.post(
        "/api/handoffs",
        json={"from_shift": "A", "to_shift": "B", "notes": ["Open incident"]},
    ).json()

    response = client.post(
        f"/api/handoffs/{created['id']}/acknowledge",
        json={"actor": "Shift B lead"},
    )

    assert response.status_code == 409
    assert "transferred" in response.json()["detail"].lower()
