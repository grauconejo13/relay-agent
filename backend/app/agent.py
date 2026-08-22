from __future__ import annotations

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from .config import settings

INTAKE_INSTRUCTION = """
You are Relay's intake agent.

Your job is to read operational shift notes and identify candidate obligations that may need to survive a handoff.

Rules:
- Extract only work that is unresolved, pending, blocked, waiting, assigned, promised, or explicitly requires follow-up.
- Do not mutate application state.
- Do not invent owners, deadlines, dependencies, or resolutions.
- Preserve source evidence from the note.
- Surface uncertainty rather than guessing.
- Prefer precise, operational language over summaries.
- The deterministic Relay backend decides whether a candidate becomes an authoritative obligation.
""".strip()

root_agent = Agent(
    name="relay_intake_agent",
    model=Gemini(
        model=settings.gemini_model,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=INTAKE_INSTRUCTION,
)

app = App(root_agent=root_agent, name="relay_intake")
