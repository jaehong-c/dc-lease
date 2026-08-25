"use client";

import { DEFAULT_ASSUMPTIONS } from "../lib/economics";

const CONTROLS = [
  { key: "discountRatePct", label: "Discount rate", min: 6, max: 14, step: 0.5, fmt: (v) => `${v.toFixed(1)}%`, hint: "Target unlevered return, not WACC" },
  { key: "capexPerCriticalMwUsd", label: "Assumed capex per critical IT MW", min: 6000000, max: 16000000, step: 500000, fmt: (v) => `$${(v / 1e6).toFixed(1)}M`, hint: "Applied only where developer capex is undisclosed" },
  { key: "escalatorDefaultPct", label: "Default escalator", min: 0, max: 4, step: 0.25, fmt: (v) => `${v.toFixed(2)}%`, hint: "Applied only where the escalator is undisclosed" },
  { key: "opexPctOfRevenue", label: "Opex share, non-NNN deals", min: 10, max: 35, step: 1, fmt: (v) => `${v}%`, hint: "Applied to hosting, gross, or unknown structures" },
  { key: "constructionMonthsBeforeDelivery", label: "Construction window", min: 6, max: 30, step: 3, fmt: (v) => `${v} mo`, hint: "Capex spread evenly before first delivery" },
];

export default function Assumptions({ value, onChange }) {
  function set(key, v) {
    onChange({ ...value, [key]: v });
  }

  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div className="card-title">Assumptions</div>
          <div className="card-sub">Rent assumes NNN with power passed through at cost.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onChange(DEFAULT_ASSUMPTIONS)}>Reset</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {CONTROLS.map((c) => {
          const v = value[c.key];
          const pct = ((v - c.min) / (c.max - c.min)) * 100;
          return (
            <div key={c.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span className="field-label" style={{ marginBottom: 0 }}>{c.label}</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{c.fmt(v)}</span>
              </div>
              <input
                type="range"
                className="range"
                min={c.min}
                max={c.max}
                step={c.step}
                value={v}
                style={{ "--pct": `${pct}%` }}
                onChange={(e) => set(c.key, Number(e.target.value))}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span className="field-hint">{c.fmt(c.min)}</span>
                <span className="field-hint">{c.hint}</span>
                <span className="field-hint">{c.fmt(c.max)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider" style={{ margin: "16px 0 12px" }} />
      <p className="muted" style={{ fontSize: 12 }}>
        NPV and IRR cover the base term only, with no terminal value and no leverage. Analysis date {value.analysisDate}.
        Tenant-funded capex is repaid through rent credits capped at {value.rentCreditCapPct}% of monthly rent.
      </p>
    </section>
  );
}