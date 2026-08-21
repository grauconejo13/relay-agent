'use client';

import { useMemo, useState } from 'react';

type ObligationStatus = 'open' | 'handed_off' | 'acknowledged' | 'waiting' | 'blocked' | 'resolved';
type HandoffStatus = 'draft' | 'handed_off' | 'acknowledged' | 'complete';

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
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(
    () => handoff?.obligations.filter((item) => item.status !== 'resolved').length ?? 0,
    [handoff]
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
        <div className="actions">
          <button type="button" onClick={startDemo} disabled={busy}>
            {busy ? 'Relay is working…' : handoff ? 'Reset demo handoff' : 'Start demo handoff'}
          </button>
          <span>Deterministic demo · Shift A → Shift B</span>
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
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
        <div className="panelHeader">
          <div>
            <p className="eyebrow">LIVE CONTINUITY</p>
            <h2 id="open-work-heading">{handoff ? `${handoff.from_shift} → ${handoff.to_shift}` : 'No active handoff'}</h2>
          </div>
          <span className="badge">{handoff ? `${activeCount} active · ${handoff.status.replace('_', ' ')}` : 'Ready'}</span>
        </div>

        {!handoff ? (
          <div className="emptyState">
            <p>Start the demo to load three operational updates and create Relay’s first continuity record.</p>
          </div>
        ) : (
          <>
            <div className="flowActions">
              <button type="button" onClick={transfer} disabled={busy || handoff.status !== 'draft'}>Transfer to Shift B</button>
              <button type="button" onClick={acknowledge} disabled={busy || handoff.status !== 'handed_off'}>Acknowledge handoff</button>
            </div>
            <div className="items">
              {handoff.obligations.map((item) => (
                <article className="item" key={item.id}>
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
        )}
      </section>

      {handoff ? (
        <section className="panel timelinePanel" aria-labelledby="timeline-heading">
          <div className="panelHeader"><div><p className="eyebrow">AUDIT TRAIL</p><h2 id="timeline-heading">What Relay carried forward</h2></div></div>
          <ol className="timeline">
            {[...handoff.timeline].reverse().map((event) => (
              <li key={event.id}>
                <span>{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div><strong>{event.actor}</strong><p>{event.message}</p></div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
