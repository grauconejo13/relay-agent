const handoffItems = [
  { title: 'Conveyor 14 sensor', status: 'Waiting on part', owner: 'Maintenance' },
  { title: 'Dock door 3 fault', status: 'Investigating', owner: 'Facilities' },
  { title: 'Late carrier arrival', status: 'Needs follow-up', owner: 'Outbound' }
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">RELAY / CONTINUITY AGENT</p>
        <h1>Nothing important gets lost between shifts.</h1>
        <p className="lede">
          Relay turns scattered operational updates into an accountable handoff, then keeps following unresolved work after responsibility changes hands.
        </p>
        <div className="actions">
          <button type="button">Start demo handoff</button>
          <span>Demo workspace · Shift A → Shift B</span>
        </div>
      </section>

      <section className="panel" aria-labelledby="open-work-heading">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">LIVE CONTINUITY</p>
            <h2 id="open-work-heading">Open obligations</h2>
          </div>
          <span className="badge">3 active</span>
        </div>
        <div className="items">
          {handoffItems.map((item) => (
            <article className="item" key={item.title}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.status}</p>
              </div>
              <span>{item.owner}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
