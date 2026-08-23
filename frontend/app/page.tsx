'use client';

import { useMemo, useState } from 'react';

type ObligationStatus = 'open' | 'handed_off' | 'acknowledged' | 'waiting' | 'blocked' | 'resolved';
type HandoffStatus = 'draft' | 'handed_off' | 'acknowledged' | 'complete';
type ReviewState = 'pending' | 'approved' | 'rejected';

type Obligation = {
  id: string;
  title: string;
  summary: string;
  owner: string;
  status: ObligationStatus;
  dependency?: string | null;
};

type TimelineEvent = {
  id: string;
  type: string;
  message: string;
  actor: string;
  created_at: string;
};

type Handoff = {
  id: string;
  from_shift: string;
  to_shift: string;
  status: HandoffStatus;
  obligations: Obligation[];
  timeline: TimelineEvent[];
  acknowledged_by?: string | null;
};

type CandidateObligation = {
  title: string;
  summary: string;
  owner?: string | null;
  dependency?: string | null;
  follow_up_condition?: string | null;
  confidence: number;
  source_note: string;
};

type ReviewCandidate = CandidateObligation & {
  id: string;
  reviewState: ReviewState;
};

type IntakeResult = {
  mode: string;
  candidates: CandidateObligation[];
  warnings: string[];
};

const API_URL = process.env.NEXT_PUBLIC_RELAY_API_URL ?? 'http://localhost:8000';

const demoNotes = [
  'Conveyor 14 is stopping intermittently. Maintenance inspected it and a replacement sensor is expected at 22:00.',
  'Dock door 3 fault is still under investigation by Facilities. Keep the lane clear until they confirm the reset.',
  'Carrier Northstar is running late. Outbound needs to confirm the revised arrival time before trailer assignment.'
];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Relay API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default function HomePage() {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [busy, setBusy] = useState(false);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intakeMode, setIntakeMode] = useState<string | null>(null);
  const [intakeWarnings, setIntakeWarnings] = useState<string[]>([]);
  const [notes, setNotes] = useState(demoNotes.join('\n'));
  const [candidates, setCandidates] = useState<ReviewCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(true);
  const [continuityOpen, setContinuityOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const activeCount = useMemo(
    () => handoff?.obligations.filter((item) => item.status !== 'resolved').length ?? 0,
    [handoff]
  );

  const approvedCount = useMemo(
    () => candidates.filter((candidate) => candidate.reviewState === 'approved').length,
    [candidates]
  );

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0] ?? null,
    [candidates, selectedCandidateId]
  );

  async function runAction(action: () => Promise<Handoff>) {
    setBusy(true);
    setError(null);
    try {
      setHandoff(await action());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Relay could not complete that action.');
    } finally {
      setBusy(false);
    }
  }

  async function extractCandidates() {
    const cleanedNotes = notes
      .split('\n')
      .map((note) => note.trim())
      .filter(Boolean);

    setIntakeBusy(true);
    setError(null);
    try {
      const result = await api<IntakeResult>('/api/intake/extract', {
        method: 'POST',
        body: JSON.stringify({ notes: cleanedNotes })
      });
      const nextCandidates = result.candidates.map((candidate, index) => ({
        ...candidate,
        id: `${index}-${candidate.title}`,
        reviewState: 'pending' as ReviewState
      }));
      setIntakeMode(result.mode);
      setIntakeWarnings(result.warnings);
      setCandidates(nextCandidates);
      setSelectedCandidateId(nextCandidates[0]?.id ?? null);
      setNotesOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Relay could not extract candidate obligations.');
    } finally {
      setIntakeBusy(false);
    }
  }

  function updateCandidate(id: string, field: keyof CandidateObligation, value: string) {
    setCandidates((current) =>
      current.map((candidate) => (candidate.id === id ? { ...candidate, [field]: value } : candidate))
    );
  }

  function reviewCandidate(id: string, reviewState: ReviewState) {
    setCandidates((current) =>
      current.map((candidate) => (candidate.id === id ? { ...candidate, reviewState } : candidate))
    );
  }

  function startDemo() {
    return runAction(() =>
      api<Handoff>('/api/handoffs', {
        method: 'POST',
        body: JSON.stringify({ from_shift: 'Shift A', to_shift: 'Shift B', notes: demoNotes })
      })
    );
  }

  function transfer() {
    if (!handoff) return;
    return runAction(() => api<Handoff>(`/api/handoffs/${handoff.id}/transfer`, { method: 'POST' }));
  }

  function acknowledge() {
    if (!handoff) return;
    return runAction(() =>
      api<Handoff>(`/api/handoffs/${handoff.id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ actor: 'Shift B lead' })
      })
    );
  }

  function resolve(obligationId: string) {
    if (!handoff) return;
    return runAction(() =>
      api<Handoff>(`/api/handoffs/${handoff.id}/obligations/${obligationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          actor: 'Shift B lead',
          note: 'Incoming shift verified the follow-up and marked this obligation resolved.'
        })
      })
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">RELAY / CONTINUITY AGENT</p>
        <h1>Nothing important gets lost between shifts.</h1>
        <p className="lede">
          Relay watches operational work, carries unresolved obligations across responsibility changes, and keeps an auditable record until the loop is closed.
        </p>
        {error ? <p className="error" role="alert">{error}</p> : null}
      </section>

      <section className="panel reviewPanel" aria-labelledby="review-heading">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">AI INTAKE / HUMAN REVIEW</p>
            <h2 id="review-heading">Review candidate obligations</h2>
          </div>
          <span className="badge">{intakeMode ? `${intakeMode} · ${approvedCount}/${candidates.length} approved` : 'Review-only'}</span>
        </div>

        <button className="sectionToggle" type="button" onClick={() => setNotesOpen((current) => !current)} aria-expanded={notesOpen}>
          <span><strong>Operational notes</strong><small>{notesOpen ? 'Hide intake' : 'Show or edit intake'}</small></span>
          <span aria-hidden="true">{notesOpen ? '−' : '+'}</span>
        </button>

        {notesOpen ? (
          <div className="intakeArea">
            <p className="reviewIntro">
              Paste operational notes, let Relay extract candidate obligations, then review one task at a time.
            </p>
            <label className="notesField">
              <span>Operational notes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={6} />
            </label>
            <div className="flowActions">
              <button type="button" onClick={extractCandidates} disabled={intakeBusy}>
                {intakeBusy ? 'Extracting…' : 'Extract candidate obligations'}
              </button>
            </div>
          </div>
        ) : null}

        {intakeWarnings.length ? (
          <div className="warningBox" role="status">
            {intakeWarnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        ) : null}

        {candidates.length && selectedCandidate ? (
          <div className="reviewWorkspace">
            <nav className="candidateNav" aria-label="Candidate obligations">
              <div className="candidateNavHeader">
                <strong>Tasks</strong>
                <span>{candidates.length}</span>
              </div>
              {candidates.map((candidate, index) => (
                <button
                  type="button"
                  className={`candidateNavItem ${candidate.id === selectedCandidate.id ? 'candidateNavItem--active' : ''}`}
                  key={candidate.id}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                >
                  <span className="candidateNumber">{index + 1}</span>
                  <span className="candidateNavText">
                    <strong>{candidate.title}</strong>
                    <small>{candidate.owner || 'Unassigned'} · {candidate.reviewState}</small>
                  </span>
                  <span className={`stateDot stateDot--${candidate.reviewState}`} aria-hidden="true" />
                </button>
              ))}
            </nav>

            <article className={`candidateDetail candidateCard--${selectedCandidate.reviewState}`}>
              <div className="candidateTopline">
                <span>Selected task</span>
                <span>{Math.round(selectedCandidate.confidence * 100)}% confidence</span>
                <span className="reviewState">{selectedCandidate.reviewState}</span>
              </div>

              <div className="candidateFields">
                <label>
                  <span>Title</span>
                  <input value={selectedCandidate.title} onChange={(event) => updateCandidate(selectedCandidate.id, 'title', event.target.value)} />
                </label>
                <label>
                  <span>Owner</span>
                  <input value={selectedCandidate.owner ?? ''} onChange={(event) => updateCandidate(selectedCandidate.id, 'owner', event.target.value)} placeholder="Unassigned" />
                </label>
                <label className="wideField">
                  <span>Summary</span>
                  <textarea value={selectedCandidate.summary} onChange={(event) => updateCandidate(selectedCandidate.id, 'summary', event.target.value)} rows={3} />
                </label>
                <label>
                  <span>Dependency</span>
                  <input value={selectedCandidate.dependency ?? ''} onChange={(event) => updateCandidate(selectedCandidate.id, 'dependency', event.target.value)} placeholder="None detected" />
                </label>
                <label>
                  <span>Follow-up condition</span>
                  <input value={selectedCandidate.follow_up_condition ?? ''} onChange={(event) => updateCandidate(selectedCandidate.id, 'follow_up_condition', event.target.value)} placeholder="None detected" />
                </label>
              </div>

              <div className="evidenceBox">
                <span>Source evidence</span>
                <p>{selectedCandidate.source_note}</p>
              </div>

              <div className="reviewActions">
                <button type="button" className="approveButton" onClick={() => reviewCandidate(selectedCandidate.id, 'approved')}>Approve</button>
                <button type="button" className="secondaryButton" onClick={() => reviewCandidate(selectedCandidate.id, 'pending')}>Keep pending</button>
                <button type="button" className="rejectButton" onClick={() => reviewCandidate(selectedCandidate.id, 'rejected')}>Reject</button>
              </div>
            </article>
          </div>
        ) : (
          <div className="emptyState"><p>No candidates yet. Extract the sample notes to preview the review workflow.</p></div>
        )}
      </section>

      <section className="sourceGrid" aria-label="Connected systems">
        {['Operations feed', 'Maintenance', 'Outbound'].map((source) => (
          <article className="sourceCard" key={source}>
            <span className="statusDot" aria-hidden="true" />
            <div><strong>{source}</strong><small>Demo source connected</small></div>
          </article>
        ))}
      </section>

      <section className="panel" aria-labelledby="open-work-heading">
        <button className="sectionToggle sectionToggle--panel" type="button" onClick={() => setContinuityOpen((current) => !current)} aria-expanded={continuityOpen}>
          <span><span className="eyebrow">LIVE CONTINUITY</span><strong id="open-work-heading">{handoff ? `${handoff.from_shift} → ${handoff.to_shift}` : 'No active handoff'}</strong></span>
          <span className="toggleMeta">{handoff ? `${activeCount} active · ${handoff.status.replace('_', ' ')}` : 'Ready'} · {continuityOpen ? '−' : '+'}</span>
        </button>

        {continuityOpen ? (!handoff ? (
          <div className="emptyState">
            <p>The review queue above is intentionally isolated from this deterministic handoff state.</p>
            <div className="actions">
              <button type="button" onClick={startDemo} disabled={busy}>
                {busy ? 'Relay is working…' : 'Start deterministic demo handoff'}
              </button>
              <span>Shift A → Shift B</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flowActions">
              <button type="button" onClick={transfer} disabled={busy || handoff.status !== 'draft'}>Transfer to Shift B</button>
              <button type="button" onClick={acknowledge} disabled={busy || handoff.status !== 'handed_off'}>Acknowledge handoff</button>
            </div>
            <div className="items">
              {handoff.obligations.map((item, index) => (
                <article className="item" key={item.id}>
                  <span className="itemIndex">{index + 1}</span>
                  <div>
                    <div className="itemMeta"><span>{item.status.replace('_', ' ')}</span><span>{item.owner}</span></div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    {item.dependency ? <p className="dependency">Waiting on: {item.dependency}</p> : null}
                  </div>
                  <button type="button" className="secondaryButton" onClick={() => resolve(item.id)} disabled={busy || item.status === 'resolved'}>
                    {item.status === 'resolved' ? 'Resolved' : 'Resolve'}
                  </button>
                </article>
              ))}
            </div>
          </>
        )) : null}
      </section>

      {handoff ? (
        <section className="panel timelinePanel" aria-labelledby="timeline-heading">
          <button className="sectionToggle sectionToggle--panel" type="button" onClick={() => setTimelineOpen((current) => !current)} aria-expanded={timelineOpen}>
            <span><span className="eyebrow">AUDIT TRAIL</span><strong id="timeline-heading">What Relay carried forward</strong></span>
            <span className="toggleMeta">{handoff.timeline.length} events · {timelineOpen ? '−' : '+'}</span>
          </button>
          {timelineOpen ? (
            <ol className="timeline">
              {[...handoff.timeline].reverse().map((event) => (
                <li key={event.id}>
                  <span>{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <div><strong>{event.actor}</strong><p>{event.message}</p></div>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
