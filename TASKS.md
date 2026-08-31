# Relay submission QA

## DONE

- [x] Verified that the frontend production build compiles successfully (`frontend`: `npm.cmd run build`).
- [x] Verified backend lifecycle and intake test coverage exists by inspecting `backend/tests/`.
- [x] Verified Playwright is not installed or configured: no dependency, config, or E2E spec is present.
- [x] Verified the app has explicit source-notes, candidate-review, visible in-flight analysis, handoff, and audit-trail UI states in the current build.
- [x] Verified the updated frontend production build passes after routing handoff creation through approved review candidates.

## MUST FIX BEFORE SUBMISSION

- [ ] **Blocker — small — low risk tonight:** Verify the implemented reviewed-candidate creation path with backend tests on Python 3.11+. It submits only approved candidates and preserves the edited obligation fields and source evidence.
- [ ] **Blocker — small — low risk tonight:** Verify the implemented lifecycle guard with backend tests on Python 3.11+. The API now rejects resolution before acknowledgement, and the UI offers Resolve only after acknowledgement.
- [ ] **Blocker — tiny — low risk tonight:** Configure and verify live Gemini for the demo. The checked-in environment defaults to `RELAY_INTAKE_MODE=fallback`, so the visible analysis currently says fallback rather than Gemini.
- [ ] **Important — small — low risk tonight:** Make allowed CORS origins deployment-configurable and set `NEXT_PUBLIC_RELAY_API_URL` in the deployed frontend. Current defaults allow/call only localhost.

## DEPLOYMENT

- [ ] Provision a Python 3.11+ environment and install backend dev/runtime dependencies; this workspace only exposes Python 3.9 and has no backend virtual environment.
- [ ] Run `py -3.11 -m pytest -q` from `backend/` after Python 3.11 and dependencies are available; the current workspace has no Python 3.11 installation.
- [ ] Verify production frontend origin, backend API URL, Gemini credentials/model access, and CORS together in the deployed environment.
- [ ] Confirm the in-memory store is acceptable for the demo process lifetime; all handoffs disappear on backend restart.

## OPTIONAL IF TIME

- [ ] **Important — small — medium risk tonight:** Prevent a repeated acknowledge request from adding duplicate acknowledgement audit events; backend currently permits acknowledgement while already acknowledged.
- [ ] **Important — tiny — low risk tonight:** Handle a zero-obligation handoff explicitly (reject it or mark it complete); it otherwise can be acknowledged forever without reaching `complete`.
- [ ] **Polish — tiny — low risk tonight:** Add an in-app badge explaining whether analysis is live Gemini or deterministic fallback before the judge initiates the flow.
- [ ] **Polish — small — medium risk tonight:** Add a minimal Playwright smoke test only after the three blockers are fixed and a browser-enabled CI/runtime is available. It is not justified to introduce it during final QA as a new dependency today.
