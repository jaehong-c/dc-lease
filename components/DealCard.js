"use client";

import { fmtUsd, fmtRate, fmtPct, fmtYears } from "../lib/economics";

const SHADES = ["var(--bar-5)", "var(--bar-3)", "var(--bar-2)"];
export const NEW_CUSTOM = "__custom_new__";

function BasisChip({ basis }) {
  if (!basis || basis === "stated" || basis === "computed") return null;
  const cls = basis === "derived" ? "chip chip-derived" : "chip chip-unverified";
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

function optionLabel(d) {
  return `${d.developerTicker || "Custom"} / ${d.tenantShort || d.tenant || "untitled"} · ${d.criticalItMw ?? "?"} MW`;
}

function DealSelect({ value, library, customs, onChange, placeholder }) {
  return (
    <select className="field-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      <optgroup label="Library">
        {library.map((d) => (
          <option key={d.id} value={d.id}>{optionLabel(d)}</option>
        ))}
      </optgroup>
      <optgroup label="Custom">
        {customs.map((d) => (
          <option key={d.id} value={d.id}>{optionLabel(d)}</option>
        ))}
        <option value={NEW_CUSTOM}>+ New custom deal</option>
      </optgroup>
    </select>
  );
}

function Hero({ label, value, sub }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="num-hero" style={{ fontSize: 30, marginTop: 4 }}>
        {fmtRate(value)}
      </div>
      {sub && <div className="muted mono" style={{ fontSize: 11.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function DealCard({ index, deal, result, verdict, library, customs, onChange, onClear, onCustomize, onEdit }) {
  const shade = SHADES[index] || SHADES[0];

  // Empty slot
  if (!deal) {
    return (
      <section className="card card-hover" style={{ minHeight: 440, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="eyebrow">Deal {index + 1}</span>
          <span className="chip chip-outline">Empty</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
          <div className="num-hero" style={{ color: "var(--ink-4)" }}>
            $0<span className="num-hero-unit">/kW/mo</span>
          </div>
          <p className="muted" style={{ fontSize: 13, maxWidth: 240 }}>
            Pick a disclosed lease from the library, or enter your own.
          </p>
          <div style={{ width: "100%", maxWidth: 280 }}>
            <DealSelect value="" library={library} customs={customs} onChange={onChange} placeholder="Select deal" />
          </div>
        </div>
      </section>
    );
  }

  if (!result || !result.ok) {
    return (
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="eyebrow">Deal {index + 1}</span>
          <span className="chip chip-unverified">Incomplete</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{optionLabel(deal)}</div>
        <p className="muted" style={{ fontSize: 13 }}>{result?.reason || "Could not evaluate this deal."}</p>
        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          {deal.custom && <button className="btn btn-primary btn-sm" onClick={onEdit}>Edit</button>}
          <button className="btn btn-ghost btn-sm" onClick={onClear}>Clear</button>
        </div>
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
          {deal.custom && <span className="chip chip-outline">Custom</span>}
        </div>
        <span className={verdictCls}>{verdict}</span>
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {deal.developerTicker || "Custom"} <span className="muted" style={{ fontWeight: 400 }}>/</span> {deal.tenantShort || deal.tenant || "untitled"}
        </div>
        <div className="card-sub">
          {[deal.campus, deal.state].filter(Boolean).join(", ") || "Location not set"}
          {deal.announcedDate ? ` · announced ${deal.announcedDate}` : ""}
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

      {/* Two hero numbers, equal weight */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 4 }}>
        <Hero label="Avg $/kW/mo" value={o.rateAvg} sub={o.rateAvgGross != null ? `on gross MW ${fmtRate(o.rateAvgGross)}` : "over base term"} />
        <Hero label="Year-1 $/kW/mo" value={o.rateYr1} sub={`${f.escalator === "stated" ? "" : "assumed "}${result.inputs.escalatorPct.toFixed(1)}% escalator`} />
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
        <DealSelect value={deal.id} library={library} customs={customs} onChange={onChange} />
        {deal.custom ? (
          <button className="btn btn-primary btn-sm" onClick={onEdit}>Edit</button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={onCustomize} title="Copy into a custom deal and edit the numbers">
            Customize
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onClear} title="Clear slot">
          Clear
        </button>
      </div>
    </section>
  );
}