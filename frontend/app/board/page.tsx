'use client';

import { useEffect, useMemo, useState } from 'react';

type Obligation = {
  id: string;
  title: string;
  summary: string;
  owner: string;
  status: string;
  dependency?: string | null;
};

type Handoff = {
  id: string;
  from_shift: string;
  to_shift: string;
  status: string;
  obligations: Obligation[];
  updated_at?: string;
};

const API_URL = process.env.NEXT_PUBLIC_RELAY_API_URL ?? 'http://localhost:8000';

async function fetchLatestHandoff(): Promise<Handoff | null> {
  const response = await fetch(`${API_URL}/api/handoffs`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Relay API returned ${response.status}`);
  const handoffs = (await response.json()) as Handoff[];
  return handoffs.length ? handoffs[handoffs.length - 1] : null;
}

export default function SharedBoardPage() {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const latest = await fetchLatestHandoff();
        if (!cancelled) {
          setHandoff(latest);
          setError(null);
          setLastSync(new Date());
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not refresh Relay board.');
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const activeCount = useMemo(
    () => handoff?.obligations.filter((item) => item.status !== 'resolved').length ?? 0,
    [handoff]
  );

  return (
    <main className="boardShell">
      <header className="boardHeader">
        <div>
          <p className="eyebrow">RELAY / SHARED DISPLAY</p>
          <h1>Live continuity board</h1>
        </div>
        <div className="boardSync" aria-live="polite">
          <span className="statusDot" aria-hidden="true" />
          <div>
            <strong>{error ? 'Connection issue' : 'Live'}</strong>
            <small>{lastSync ? `Updated ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting…'}</small>
          </div>
        </div>
      </header>

      {error ? <p className="boardError">{error}</p> : null}

      {!handoff ? (
        <section className="boardEmpty">
          <p>No handoff is active yet.</p>
          <span>Start a handoff from the Relay operator view. This screen will update automatically.</span>
        </section>
      ) : (
        <>
          <section className="boardSummary">
            <div>
              <span>HANDOFF</span>
              <strong>{handoff.from_shift} → {handoff.to_shift}</strong>
            </div>
            <div>
              <span>STATUS</span>
              <strong>{handoff.status.replace('_', ' ')}</strong>
            </div>
            <div>
              <span>ACTIVE</span>
              <strong>{activeCount}</strong>
            </div>
          </section>

          <section className="flightBoard" aria-label="Relay task board">
            <div className="flightRow flightHead">
              <span>Task</span>
              <span>Status</span>
              <span>Assigned to</span>
              <span>Dependency</span>
            </div>

            {handoff.obligations.map((item) => (
              <article className={`flightRow ${item.status === 'resolved' ? 'isResolved' : ''}`} key={item.id}>
                <div className="flightTask">
                  <strong>{item.title}</strong>
                  <small>{item.summary}</small>
                </div>
                <span className="flightStatus">{item.status.replace('_', ' ')}</span>
                <strong className={item.owner === 'Unassigned' ? 'unassigned' : ''}>{item.owner}</strong>
                <span>{item.dependency ?? '—'}</span>
              </article>
            ))}
          </section>

          <footer className="boardFooter">
            <span>Open Relay on a phone or laptop to claim or update work.</span>
            <span>Auto-refresh · 4s</span>
          </footer>
        </>
      )}
    </main>
  );
}
