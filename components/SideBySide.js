"use client";

import { fmtUsd, fmtRate, fmtPct, WEIGHTS } from "../lib/economics";

const SHADES = ["var(--bar-5)", "var(--bar-3)", "var(--bar-2)"];

const METRICS = [
  { key: "rateAvg", label: "Rate, avg over term ($/kW/mo)", fmt: fmtRate },
  { key: "rateYr1", label: "Rate, yr 1 ($/kW/mo)", fmt: fmtRate },
  { key: "yieldOnCost", label: "Yield on cost", fmt: (v) => fmtPct(v) },
  { key: "projectIrr", label: "Unlevered IRR", fmt: (v) => fmtPct(v) },
  { key: "projectNpv", label: "Project NPV", fmt: (v) => fmtUsd(v) },
];

const AXES = [
  { key: "pricing", label: "Pricing" },
  { key: "credit", label: "Credit" },
  { key: "termStructure", label: "Term & structure" },
  { key: "capexEfficiency", label: "Capex efficiency" },
  { key: "delivery", label: "Delivery" },
];

function shortName(deal) {
  return `${deal.developerTicker || "Custom"} / ${deal.tenantShort || deal.tenant || "untitled"}`;
}

function BarRow({ label, items, max, fmt }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 12, alignItems: "start", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, color: "var(--ink-2)", paddingTop: 2 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it) => {
          const v = it.value;
          const pct = v == null || !max ? 0 : Math.max(0, Math.min(100, (v / max) * 100));
          return (
            <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr 72px", gap: 10, alignItems: "center" }}>
              <div className="bar-track" style={{ height: 14, borderRadius: 6 }}>
                <div className="bar-fill" style={{ width: `${pct}%`, background: it.shade, borderRadius: 6 }} />
              </div>
              <span className="mono" style={{ fontSize: 12.5, textAlign: "right" }}>{fmt(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SideBySide({ results, deals, verdicts, leaders }) {
  const rows = results
    .map((r, i) => ({ r, deal: deals.find((d) => d.id === r.id), shade: SHADES[i] || SHADES[0] }))
    .filter((x) => x.r.ok && x.deal);

  if (rows.length === 0) {
    return (
      <section className="card">
        <div className="card-title">Side-by-side</div>
        <div className="card-sub">Select at least one deal to compare.</div>
      </section>
    );
  }

  const leaderName = (id) => {
    const d = deals.find((x) => x.id === id);
    return d ? shortName(d) : "n/a";
  };

  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="card-title">Side-by-side</div>
          <div className="card-sub">Developer view. Bars are scaled to the strongest deal in each row.</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
          {rows.map((x) => (
            <span key={x.r.id} className="chip chip-dot" style={{ color: x.shade, background: "var(--fill)" }}>
              <span style={{ color: "var(--ink-2)" }}>{shortName(x.deal)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ marginTop: 14 }}>
        {METRICS.map((m) => {
          const items = rows.map((x) => ({ id: x.r.id, value: x.r.outputs[m.key], shade: x.shade }));
          const max = Math.max(...items.map((it) => (it.value == null ? 0 : it.value)), 0);
          return <BarRow key={m.key} label={m.label} items={items} max={max} fmt={m.fmt} />;
        })}
      </div>

      {/* Scorecard */}
      <div style={{ marginTop: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Scorecard · 1 to 5</div>
        {AXES.map((ax) => (
          <div key={ax.key} style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 12, alignItems: "start", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, color: "var(--ink-2)", paddingTop: 2 }}>
              {ax.label}
              <span className="mono muted" style={{ fontSize: 11, marginLeft: 6 }}>{Math.round(WEIGHTS[ax.key] * 100)}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((x) => {
                const a = x.r.scorecard.axes[ax.key];
                const s = a?.score;
                return (
                  <div key={x.r.id} style={{ display: "grid", gridTemplateColumns: "1fr 72px", gap: 10, alignItems: "center" }}>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${s == null ? 0 : (s / 5) * 100}%`, background: x.shade }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12.5, textAlign: "right" }}>
                      {s == null ? "n/a" : s.toFixed(1)}
                      {a?.basis && a.basis !== "stated" && a.basis !== "computed" ? <span className="muted"> *</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 12, padding: "10px 0 0", borderTop: "1px solid var(--border-strong)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Composite</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((x) => (
              <div key={x.r.id} style={{ display: "grid", gridTemplateColumns: "1fr 72px", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="chip chip-dot" style={{ color: x.shade, background: "transparent", padding: 0 }} />
                  <span style={{ fontSize: 13 }}>{shortName(x.deal)}</span>
                  <span className={`chip ${verdicts[x.r.id] === "Stronger" ? "chip-ink" : "chip-outline"}`}>{verdicts[x.r.id]}</span>
                </div>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>
                  {x.r.scorecard.composite == null ? "n/a" : x.r.scorecard.composite.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
          * score rests on an assumed or partly unknown input. Composite is weight-averaged over available axes.
        </p>
      </div>

      {/* Leaders */}
      {leaders && rows.length > 1 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6, fontSize: 12.5 }}>
          <div><span className="muted">Highest rate </span>{leaderName(leaders.rateYr1)}</div>
          <div><span className="muted">Best credit </span>{leaderName(leaders.bestCredit)}</div>
          <div><span className="muted">Highest yield on cost </span>{leaderName(leaders.yieldOnCost)}</div>
          <div><span className="muted">Fastest to full delivery </span>{leaderName(leaders.fastestDelivery)}</div>
        </div>
      )}
    </section>
  );
}