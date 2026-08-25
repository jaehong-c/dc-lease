"use client";

import { fmtUsd, fmtRate, fmtPct, fmtYears } from "../lib/economics";

const SHADES = ["var(--bar-5)", "var(--bar-3)", "var(--bar-2)"];

function BasisChip({ basis }) {
  if (!basis || basis === "stated" || basis === "computed") return null;
  const cls =
    basis === "derived" ? "chip chip-derived" : basis === "assumed" ? "chip chip-unverified" : "chip chip-unverified";
  return <span className={cls}>{basis}</span>;
}

function Line({ label, value, basis, total }) {
  return (
    <div className={`line-item${total ? " total" : ""}`}>
      <span className="label">{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <BasisChip basis={basis} />
        <span className="value">{value}</span>
      </span>
    </div>
  );
}

function deliveryLabel(months, quarter) {
  if (quarter == null) return "n/a";
  if (months != null && months <= 0) return "In service";
  return quarter;
}

export default function DealCard({ index, deal, result, verdict, library, onChange, onClear }) {
  const shade = SHADES[index] || SHADES[0];

  // Empty slot
  if (!deal) {
    return (
      <section className="card card-hover" style={{ minHeight: 420, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="eyebrow">Deal {index + 1}</span>
          <span className="chip chip-outline">Empty</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
          <div className="num-hero" style={{ color: "var(--ink-4)" }}>
            $0<span className="num-hero-unit">/kW/mo</span>
          </div>
          <p className="muted" style={{ fontSize: 13, maxWidth: 220 }}>
            Pick a disclosed lease from the library.
          </p>
          <select className="field-select" style={{ maxWidth: 260 }} value="" onChange={(e) => onChange(e.target.value)}>
            <option value="" disabled>
              Select deal
            </option>
            {library.map((d) => (
              <option key={d.id} value={d.id}>
                {d.developerTicker} / {d.tenant} · {d.criticalItMw} MW
              </option>
            ))}
          </select>
        </div>
      </section>
    );
  }

  if (!result || !result.ok) {
    return (
      <section className="card">
        <span className="eyebrow">Deal {index + 1}</span>
        <p className="muted" style={{ marginTop: 12 }}>{result?.reason || "Could not evaluate this deal."}</p>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={onClear}>Clear</button>
      </section>
    );
  }

  const o = result.outputs;
  const c = result.credit;
  const f = result.flags;
  const tierCls = `chip chip-tier-${c.effectiveTier}`;
  const verdictCls = verdict === "Stronger" ? "chip chip-ink" : "chip chip-outline";

  return (
    <section className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: shade, display: "inline-block" }} />
          <span className="eyebrow">Deal {index + 1}</span>
        </div>
        <span className={verdictCls}>{verdict}</span>
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {deal.developerTicker} <span className="muted" style={{ fontWeight: 400 }}>/</span> {deal.tenant}
        </div>
        <div className="card-sub">
          {deal.campus}, {deal.state} · announced {deal.announcedDate}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span className={tierCls}>{c.label}</span>
        {c.backstopProvider && (
          <span className="chip chip-outline">
            Backstop: {c.backstopProvider}
            {c.coverage != null && c.coverage < 1 ? ` (${fmtPct(c.coverage, 0)})` : ""}
          </span>
        )}
        {result.inputs.nnn ? <span className="chip chip-stated">NNN</span> : <span className="chip chip-unverified">opex assumed</span>}
      </div>

      {/* Hero number */}
      <div style={{ paddingTop: 4 }}>
        <div className="num-hero">
          {fmtRate(o.rateYr1)}
          <span className="num-hero-unit">/kW/mo · yr 1</span>
        </div>
        <div className="muted mono" style={{ fontSize: 12, marginTop: 6 }}>
          avg over term {fmtRate(o.rateAvg)}
          {o.rateAvgGross != null ? ` · on gross MW ${fmtRate(o.rateAvgGross)}` : ""}
        </div>
      </div>

      {/* Line items */}
      <div>
        <Line label="Critical IT" value={`${result.inputs.mw} MW${result.inputs.grossMw ? ` (${result.inputs.grossMw} gross)` : ""}`} />
        <Line label="Term" value={`${result.inputs.termYears} yrs`} />
        <Line label="TCV (base term)" value={fmtUsd(o.tcv)} basis={f.tcv} />
        <Line label="Escalator" value={`${result.inputs.escalatorPct.toFixed(1)}%`} basis={f.escalator} />
        <Line label="NOI yr 1" value={fmtUsd(o.noiYr1)} basis={f.noi} />
        <Line label="Developer capex" value={fmtUsd(result.inputs.developerNetCapex)} basis={f.capex} />
        <Line label="Yield on cost" value={fmtPct(o.yieldOnCost)} basis={f.capex} total />
        <Line label={`Project NPV @ ${result.inputs.discountRatePct}%`} value={fmtUsd(o.projectNpv)} basis={f.capex} />
        <Line label="Unlevered IRR" value={o.projectIrr != null ? fmtPct(o.projectIrr) : "n/a"} basis={f.capex} />
        <Line label="Payback" value={fmtYears(o.paybackYears)} />
        <Line label="First rent" value={deliveryLabel(o.monthsToFirstRent, deal.deliveryStart)} />
        <Line label="Full delivery" value={deal.fullDelivery || "Undisclosed"} />
      </div>

      {/* Footer controls */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
        <select className="field-select" value={deal.id} onChange={(e) => onChange(e.target.value)}>
          {library.map((d) => (
            <option key={d.id} value={d.id}>
              {d.developerTicker} / {d.tenant} · {d.criticalItMw} MW
            </option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={onClear} title="Clear slot">
          Clear
        </button>
      </div>
    </section>
  );
}