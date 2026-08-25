function SlotPlaceholder({ index }) {
  return (
    <section className="card card-hover" style={{ minHeight: 360, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="eyebrow">Deal {index}</span>
        <span className="chip chip-outline">Empty</span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          textAlign: "center",
        }}
      >
        <div className="num-hero" style={{ color: "var(--ink-4)" }}>
          $0.00
          <span className="num-hero-unit">/kW/mo</span>
        </div>
        <p className="muted" style={{ fontSize: 13, maxWidth: 220 }}>
          Pick a disclosed lease from the library or enter a custom deal.
        </p>
        <button className="btn btn-ghost btn-sm" disabled>
          Select deal
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toolbar */}
      <section className="card card-tight" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <span className="eyebrow" style={{ marginRight: 4 }}>Presets</span>
        <button className="btn btn-primary btn-sm" disabled>WULF vs HUT</button>
        <button className="btn btn-ghost btn-sm" disabled>CORZ vs CIFR</button>
        <button className="btn btn-ghost btn-sm" disabled>GLXY vs WULF vs HUT</button>
        <span style={{ flex: 1 }} />
        <button className="btn btn-soft btn-sm" disabled>Start blank</button>
      </section>

      {/* Deal slots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20 }}>
        <SlotPlaceholder index={1} />
        <SlotPlaceholder index={2} />
        <SlotPlaceholder index={3} />
      </div>

      {/* Comparison + assumptions */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <section className="card">
          <div className="card-title">Side-by-side</div>
          <div className="card-sub">Rate, yield on cost, and scorecard across selected deals</div>
          <div className="skeleton" style={{ height: 180, marginTop: 16 }} />
        </section>
        <section className="card">
          <div className="card-title">Assumptions</div>
          <div className="card-sub">Rent assumes NNN; power passed through at cost</div>
          <div className="skeleton" style={{ height: 180, marginTop: 16 }} />
        </section>
      </div>

      {/* Data gaps + memo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
        <section className="card">
          <div className="card-title">Data gaps</div>
          <div className="card-sub">Inputs that are derived or unverified</div>
          <div className="skeleton" style={{ height: 120, marginTop: 16 }} />
        </section>
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="card-title">Investment memo</div>
              <div className="card-sub">AI interprets the numbers above. It does not score them.</div>
            </div>
            <button className="btn btn-primary btn-sm" disabled>Generate memo</button>
          </div>
          <div className="skeleton" style={{ height: 120, marginTop: 16 }} />
        </section>
      </div>
    </div>
  );
}