# Relay Vision

Relay is an autonomous continuity agent for operational handoffs.

## Problem

Important work is often lost when responsibility changes hands. Shift changes, escalations, vacations, and cross-team handoffs scatter context across notes, messages, tickets, and memory. Traditional summaries compress the past; they do not remain accountable for unresolved work after the handoff.

## Product thesis

Relay should identify unresolved obligations, owners, dependencies, missing context, and follow-up conditions; create a concise handoff; persist what remains open; and continue following those obligations after responsibility transfers.

## Hackathon MVP

Demonstrate one complete operations shift handoff:

1. Shift A provides messy operational notes and events.
2. Relay extracts obligations and uncertainty.
3. Relay creates a structured handoff for Shift B.
4. Shift B acknowledges responsibility.
5. A simulated external event changes one dependency.
6. Relay follows the unresolved obligation asynchronously.
7. Relay updates the incident and preserves the history for the next handoff.

## Product principle

Relay is not a summarizer and not a chat wrapper. The product is successful only when it preserves continuity and takes useful follow-up action with bounded autonomy.
