'use client';

import { useMemo, useState } from 'react';

type Tab = 'summary' | 'notes' | 'tasks' | 'history';
type ReviewState = 'pending' | 'approved' | 'rejected';

type Obligation = {
  id: string;
  title: string;
  summary: string;
  owner: string;
  status: string;
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
  status: string;
  obligations: Obligation[];
  timeline: TimelineEvent[];
  acknowledged_by?: string | null;
  created_at?: string;
  updated_at?: string;
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

function formatDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('summary');
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [busy, setBusy] = useState(false);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intakeMode, setIntakeMode] = useState<string | null>(null);
  const [intakeWarnings, setIntakeWarnings] = useState<string[]>([]);
  const [notes, setNotes] = useState(demoNotes.join('\n'));
  const [candidates, setCandidates] = useState<ReviewCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [lastAnalysisAt, setLastAnalysisAt] = useState<string | null>(null);

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
    const cleanedNotes = notes.split('\n').map((note) => note.trim()).filter(Boolean);
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
      setLastAnalysisAt(new Date().toISOString());
      setTab('summary');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Relay could not extract candidate obligations.');
    } finally {
      setIntakeBusy(false);
    }
  }

  function updateCandidate(id: string, field: keyof CandidateObligation, value: string) {
    setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, [field]: value } : candidate));
  }

  function reviewCandidate(id: string, reviewState: ReviewState) {
    setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, reviewState } : candidate));
  }

  function startDemo() {
    return runAction(() => api<Handoff>('/api/handoffs', {
      method: 'POST',
      body: JSON.stringify({ from_shift: 'Shift A', to_shift: 'Shift B', notes: demoNotes })
    }));
  }

  function transfer() {
    if (!handoff) return;
    return runAction(() => api<Handoff>(`/api/handoffs/${handoff.id}/transfer`, { method: 'POST' }));
  }

  function acknowledge() {
    if (!handoff) return;
    return runAction(() => api<Handoff>(`/api/handoffs/${handoff.id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ actor: 'Shift B lead' })
    }));
  }

  function resolve(obligationId: string) {
    if (!handoff) return;
    return runAction(() => api<Handoff>(`/api/handoffs/${handoff.id}/obligations/${obligationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'resolved',
        actor: 'Shift B lead',
        note: 'Incoming shift verified the follow-up and marked this obligation resolved.'
      })
    }));
  }

  const handoffDate = handoff?.created_at;
  const updatedAt = handoff?.updated_at ?? handoff?.timeline.at(-1)?.created_at;

  return (
    <main className="shell">
      <header className="appHeader">
        <div>
          <p className="eyebrow">RELAY / CONTINUITY AGENT</p>
          <h1>Shift handoff</h1>
        </div>
        <div className="dateBlock">
          <strong>{formatDate(handoffDate)}</strong>
          <span>{handoff ? `${handoff.from_shift} → ${handoff.to_shift}` : 'No active handoff'}</span>
          <small>{handoff ? `Created ${formatTime(handoffDate)} · Updated ${formatTime(updatedAt)}` : `Current time ${formatTime()}`}</small>
        </div>
      </header>

      {error ? <p className="error" role="alert">{error}</p> : null}

      <nav className="tabs" aria-label="Relay handoff sections">
        {(['summary', 'notes', 'tasks', 'history'] as Tab[]).map((item) => (
          <button key={item} type="button" className={tab === item ? 'tab tab--active' : 'tab'} onClick={() => setTab(item)}>
            {item}
            {item === 'tasks' && candidates.length ? <span>{candidates.length}</span> : null}
          </button>
        ))}
      </nav>

      {tab === 'summary' ? (
        <section className="workspace">
          <div className="summaryHero">
            <div>
              <p className="eyebrow">CURRENT HANDOFF</p>
              <h2>{handoff ? `${activeCount} unresolved item${activeCount === 1 ? '' : 's'}` : 'Ready for the next handoff'}</h2>
              <p>{handoff ? 'Relay is carrying forward the work the incoming shift still needs to know about.' : 'Analyze the operational notes, review what Relay detected, then start the deterministic handoff.'}</p>
            </div>
            <div className="summaryStats">
              <div><strong>{candidates.length}</strong><span>AI detected</span></div>
              <div><strong>{approvedCount}</strong><span>approved</span></div>
              <div><strong>{activeCount}</strong><span>active</span></div>
            </div>
          </div>

          <section className="aiPanel">
            <div className="aiHeader">
              <div>
                <span className="aiPulse" aria-hidden="true" />
                <div><strong>Relay AI analysis</strong><small>{lastAnalysisAt ? `Last analyzed ${formatTime(lastAnalysisAt)}` : 'No analysis run yet'}</small></div>
              </div>
              <span className="modeBadge">{intakeMode ?? 'waiting'}</span>
            </div>

            {!candidates.length ? (
              <div className="emptyState compact">
                <p>Relay has not analyzed the notes yet.</p>
                <button type="button" onClick={() => setTab('notes')}>Open notes</button>
              </div>
            ) : (
              <div className="insightList">
                {candidates.map((candidate, index) => (
                  <article className="insight" key={candidate.id}>
                    <span className="insightIndex">{index + 1}</span>
                    <div>
                      <div className="insightMeta"><span>AI detected</span><span>{Math.round(candidate.confidence * 100)}% confidence</span></div>
                      <h3>{candidate.title}</h3>
                      <p>{candidate.summary}</p>
                      <div className="chips">
                        {candidate.owner ? <span>Owner: {candidate.owner}</span> : null}
                        {candidate.dependency ? <span>Waiting on: {candidate.dependency}</span> : null}
                        {candidate.follow_up_condition ? <span>Follow-up: {candidate.follow_up_condition}</span> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="quickActions">
            <button type="button" onClick={() => setTab('notes')}>Review notes</button>
            <button type="button" onClick={() => setTab('tasks')} disabled={!candidates.length}>Review detected tasks</button>
            {!handoff ? <button type="button" onClick={startDemo} disabled={busy}>{busy ? 'Starting…' : 'Start demo handoff'}</button> : null}
            {handoff?.status === 'draft' ? <button type="button" onClick={transfer} disabled={busy}>Transfer to Shift B</button> : null}
            {handoff?.status === 'handed_off' ? <button type="button" onClick={acknowledge} disabled={busy}>Acknowledge handoff</button> : null}
          </section>
        </section>
      ) : null}

      {tab === 'notes' ? (
        <section className="workspace">
          <div className="sectionHeader">
            <div><p className="eyebrow">SOURCE CONTEXT</p><h2>Operational notes</h2></div>
            <span>{notes.split('\n').filter(Boolean).length} notes</span>
          </div>
          <p className="sectionIntro">This is the raw handoff context. Relay extracts proposed obligations from these notes without changing authoritative handoff state.</p>
          <label className="notesField">
            <span>Shift notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={10} />
          </label>
          <div className="analysisSteps">
            <span>Identify unresolved work</span><span>Extract dependencies</span><span>Detect owners</span><span>Find follow-up conditions</span>
          </div>
          <button className="primaryButton" type="button" onClick={extractCandidates} disabled={intakeBusy}>
            {intakeBusy ? 'Relay is analyzing…' : 'Analyze notes with Relay'}
          </button>
          {intakeWarnings.length ? <div className="warningBox">{intakeWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
        </section>
      ) : null}

      {tab === 'tasks' ? (
        <section className="workspace">
          <div className="sectionHeader">
            <div><p className="eyebrow">AI DETECTED / HUMAN CONFIRMED</p><h2>Tasks</h2></div>
            <span>{approvedCount}/{candidates.length} approved</span>
          </div>

          {!candidates.length || !selectedCandidate ? (
            <div className="emptyState"><p>No detected tasks yet. Analyze the notes first.</p><button type="button" onClick={() => setTab('notes')}>Go to notes</button></div>
          ) : (
            <div className="reviewWorkspace">
              <nav className="candidateNav" aria-label="Detected tasks">
                {candidates.map((candidate, index) => (
                  <button key={candidate.id} type="button" className={candidate.id === selectedCandidate.id ? 'candidateNavItem candidateNavItem--active' : 'candidateNavItem'} onClick={() => setSelectedCandidateId(candidate.id)}>
                    <span className="candidateNumber">{index + 1}</span>
                    <span><strong>{candidate.title}</strong><small>{candidate.owner || 'Unassigned'} · {candidate.reviewState}</small></span>
                  </button>
                ))}
              </nav>

              <article className="candidateDetail">
                <div className="candidateTopline"><span>Relay extracted</span><span>{Math.round(selectedCandidate.confidence * 100)}% confidence</span><span>{selectedCandidate.reviewState}</span></div>
                <div className="candidateFields">
                  <label><span>Title</span><input value={selectedCandidate.title} onChange={(event) => updateCandidate(selectedCandidate.id, 'title', event.target.value)} /></label>
                  <label><span>Owner</span><input value={selectedCandidate.owner ?? ''} onChange={(event) => updateCandidate(selectedCandidate.id, 'owner', event.target.value)} placeholder="Unassigned" /></label>
                  <label className="wideField"><span>Summary</span><textarea value={selectedCandidate.summary} onChange={(event) => updateCandidate(selectedCandidate.id, 'summary', event.target.value)} rows={3} /></label>
                  <label><span>Dependency</span><input value={selectedCandidate.dependency ?? ''} onChange={(event) => updateCandidate(selectedCandidate.id, 'dependency', event.target.value)} /></label>
                  <label><span>Follow-up condition</span><input value={selectedCandidate.follow_up_condition ?? ''} onChange={(event) => updateCandidate(selectedCandidate.id, 'follow_up_condition', event.target.value)} /></label>
                </div>
                <div className="evidenceBox"><span>Source evidence</span><p>{selectedCandidate.source_note}</p></div>
                <div className="reviewActions">
                  <button className="approveButton" type="button" onClick={() => reviewCandidate(selectedCandidate.id, 'approved')}>Approve</button>
                  <button className="secondaryButton" type="button" onClick={() => reviewCandidate(selectedCandidate.id, 'pending')}>Keep pending</button>
                  <button className="rejectButton" type="button" onClick={() => reviewCandidate(selectedCandidate.id, 'rejected')}>Reject</button>
                </div>
              </article>
            </div>
          )}

          {handoff ? (
            <div className="liveTasks">
              <h3>Authoritative handoff</h3>
              {handoff.obligations.map((item, index) => (
                <article className="liveTask" key={item.id}>
                  <span>{index + 1}</span>
                  <div><small>{item.status.replace('_', ' ')} · {item.owner}</small><strong>{item.title}</strong><p>{item.summary}</p>{item.dependency ? <em>Waiting on: {item.dependency}</em> : null}</div>
                  <button type="button" onClick={() => resolve(item.id)} disabled={busy || item.status === 'resolved'}>{item.status === 'resolved' ? 'Resolved' : 'Resolve'}</button>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="workspace">
          <div className="sectionHeader"><div><p className="eyebrow">AUDIT TRAIL</p><h2>History</h2></div><span>{handoff?.timeline.length ?? 0} events</span></div>
          {!handoff ? <div className="emptyState"><p>No handoff history yet.</p></div> : (
            <ol className="timeline">
              {[...handoff.timeline].reverse().map((event) => (
                <li key={event.id}>
                  <div className="timelineTime"><strong>{formatTime(event.created_at)}</strong><span>{formatDate(event.created_at)}</span></div>
                  <div><small>{event.type.replace('_', ' ')}</small><strong>{event.actor}</strong><p>{event.message}</p></div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </main>
  );
}
