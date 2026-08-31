# Relay submission closeout

## DONE

- [x] Frontend production build passed (`frontend`: `npm.cmd run build`).
- [x] Cloud Run source-deployment configuration is present: `backend/Procfile` binds Uvicorn to `$PORT`, and `RELAY_CORS_ORIGINS` configures allowed browser origins (source reviewed).

## KNOWN LIMITATIONS

- [ ] Live Gemini intake has not been verified with real credentials. The checked-in default remains `RELAY_INTAKE_MODE=fallback`.
- [ ] The visible AI-thinking state and duplicate-analysis guard are implemented but have not been exercised in a browser runtime.
- [ ] Reviewed/approved candidate creation and the acknowledgement-before-resolution guard are implemented but have not been executed by the backend test suite or a live end-to-end flow.
- [ ] Backend tests have not passed in this workspace: Python 3.11 and the backend test dependencies are unavailable here.
- [ ] Vercel deployment has not been verified.
- [ ] Google Cloud Run deployment has not been verified.
- [ ] The deployed Cloud Run `/health` endpoint has not been verified.
- [ ] The deployed `/api/intake/status` endpoint has not been verified in live Gemini mode.
- [ ] The deployed frontend-to-backend handoff flow has not been verified.
- [ ] Backend handoff state is in-memory only and is not persistent across restarts or sessions. Cloud Run scaling, cold starts, and redeployments can lose active handoffs.

## OPTIONAL / POST-HACKATHON

- [ ] Replace the in-memory handoff store with Firestore persistence.
- [ ] Add Pub/Sub-driven follow-up and a Cloud Run worker.
- [ ] Add a shared handoff board for multiple operators.
- [ ] Make acknowledgement idempotent so repeated requests do not create duplicate audit events.
- [ ] Define explicit handling for zero-obligation handoffs.
- [ ] Add Playwright smoke coverage once a browser-enabled test environment is available.
- [ ] Add deployment monitoring, durable audit retention, and production incident recovery.
