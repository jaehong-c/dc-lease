"use client";

import { fmtUsd, fmtRate, fmtPct, fmtYears } from "../lib/economics";
import { DealSelect } from "./DealCard";

const SHADES = ["var(--bar-5)", "var(--bar-3)", "var(--bar-2)"];
const BASIS = ["stated", "assumed", "unknown"];

const QUARTERS = (() => {
  const out = [];
  for (let y = 2024; y <= 2033; y++) for (let q = 1; q <= 4; q++) out.push(`${y}-Q${q}`);
  return out;
})();

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 96px 88px",
  gap: 6,
  alignItems: "center",
  padding: "6px 0",
  borderTop: "1px solid var(--border)",
};
const inputStyle = { padding: "5px 8px", fontSize: 12.5, height: 30 };

function Row({ label, children }) {
  return (
    <div style={rowStyle}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</span>
      {children}
    </div>
  );
}

function BasisSelect({ value, onChange }) {
  return (
    <select className="field-select" style={{ ...inputStyle, paddingRight: 24, backgroundPosition: "right 8px center" }} value={value} onChange={(e) => onChange(e.target.value)}>
      {BASIS.map((b) => (
        <option key={b} value={b}>{b}</option>
      ))}
    </select>
  );
}

// Numeric row: value + basis. unknown clears the value.
function NumRow({ label, deal, field, scale = 1, suffix, step, set }) {
  const value = deal[field];
  const basis = deal[`${field}Basis`] || (value == null ? "unknown" : "stated");
  const unknown = basis === "unknown";
  return (
    <Row label={label}>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          step={step}
          className="field field-mono"
          style={{ ...inputStyle, paddingRight: suffix ? 34 : 8, opacity: unknown ? 0.45 : 1 }}
          value={value == null ? "" : value / scale}
          placeholder={unknown ? "?" : ""}
          disabled={unknown}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value) * scale;
            set({ [field]: v, [`${field}Basis`]: basis === "unknown" ? "stated" : basis });
          }}
        />
        {suffix && (
          <span className="mono muted" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11 }}>
            {suffix}
          </span>
        )}
      </div>
      <BasisSelect value={basis} onChange={(b) => set({ [field]: b === "unknown" ? null : value, [`${field}Basis`]: b })} />
    </Row>
  );
}

function QuarterRow({ label, deal, field, set, allowUnknown }) {
  const basis = deal[`${field}Basis`] || "stated";
  return (
    <Row label={label}>
      <select className="field-select field-mono" style={{ ...inputStyle, paddingRight: 24, backgroundPosition: "right 8px center" }} value={deal[field] || ""} onChange={(e) => set({ [field]: e.target.value || null })}>
        {allowUnknown && <option value="">unknown</option>}
        {QUARTERS.map((q) => (
          <option key={q} value={q}>{q}</option>
        ))}
      </select>
      <select className="field-select" style={{ ...inputStyle, paddingRight: 24, backgroundPosition: "right 8px center" }} value={basis} onChange={(e) => set({ [`${field}Basis`]: e.target.value })}>
        <option value="stated">stated</option>
        <option value="assumed">assumed</option>
      </select>
    </Row>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <Row label={label}>
      <select className="field-select" style={{ ...inputStyle, paddingRight: 24, backgroundPosition: "right 8px center", gridColumn: "2 / span 2" }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Row>
  );
}

function Hero({ label, value, sub }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="num-hero" style={{ fontSize: 30, marginTop: 4, color: value == null ? "var(--ink-4)" : "var(--ink)" }}>
        {value == null ? "$0" : fmtRate(value)}
      </div>
      {sub && <div className="muted mono" style={{ fontSize: 11.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function CustomDealCard({ index, deal, result, verdict, library, customs, onChange, onSelect, onClear, onDone }) {
  const shade = SHADES[index] || SHADES[0];
  const set = (patch) => onChange({ ...deal, ...patch });
  const ok = result && result.ok;
  const o = ok ? result.outputs : null;
  const valid = deal.criticalItMw > 0 && deal.termYears > 0 && (deal.tcv != null || deal.annualRentYr1 != null);

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: shade, display: "inline-block" }} />
          <span className="eyebrow">Deal {index + 1}</span>
          <span className="chip chip-outline">Custom · editing</span>
        </div>
        {ok ? <span className={verdict === "Stronger" ? "chip chip-ink" : "chip chip-outline"}>{verdict}</span> : <span className="chip chip-unverified">Incomplete</span>}
      </div>

      {/* Identity */}
      <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 6 }}>
        <input className="field" style={inputStyle} placeholder="Ticker" value={deal.developerTicker || ""} onChange={(e) => set({ developerTicker: e.target.value.toUpperCase() })} />
        <input className="field" style={inputStyle} placeholder="Tenant" value={deal.tenant || ""} onChange={(e) => set({ tenant: e.target.value, tenantShort: e.target.value })} />
        <input className="field" style={inputStyle} placeholder="State" maxLength={2} value={deal.state || ""} onChange={(e) => set({ state: e.target.value.toUpperCase() })} />
        <input className="field" style={inputStyle} placeholder="Campus" value={deal.campus || ""} onChange={(e) => set({ campus: e.target.value })} />
      </div>

      {/* Credit chips as selects */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <select className="field-select" style={{ ...inputStyle, paddingRight: 24, backgroundPosition: "right 8px center" }} value={deal.tenantCreditTier || 2} onChange={(e) => set({ tenantCreditTier: Number(e.target.value) })}>
          <option value={1}>Tier 1 · Investment grade</option>
          <option value={2}>Tier 2 · Well-funded private</option>
          <option value={3}>Tier 3 · Speculative</option>
        </select>
        <input
          className="field"
          style={inputStyle}
          placeholder="Backstop provider (optional)"
          value={deal.backstop?.provider || ""}
          onChange={(e) => {
            const provider = e.target.value;
            set({ backstop: provider ? { provider, amount: deal.backstop?.amount ?? null, scope: "Lease obligations" } : null });
          }}
        />
      </div>

      {/* Live hero numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 2 }}>
        <Hero label="Avg $/kW/mo" value={o?.rateAvg} sub={o?.rateAvgGross != null ? `on gross MW ${fmtRate(o.rateAvgGross)}` : "over base term"} />
        <Hero label="Year-1 $/kW/mo" value={o?.rateYr1} sub={ok ? `${result.flags.escalator === "stated" ? "" : "assumed "}${result.inputs.escalatorPct.toFixed(1)}% escalator` : "needs MW, term, TCV"} />
      </div>

      {/* Editable line items, same order as library cards */}
      <div>
        <div style={{ ...rowStyle, borderTop: "none", padding: "0 0 4px" }}>
          <span className="eyebrow">Input</span>
          <span className="eyebrow" style={{ textAlign: "right" }}>Value</span>
          <span className="eyebrow" style={{ textAlign: "right" }}>Basis</span>
        </div>
        <NumRow label="Critical IT" deal={deal} field="criticalItMw" suffix="MW" set={set} />
        <NumRow label="Gross MW" deal={deal} field="grossMw" suffix="MW" set={set} />
        <NumRow label="Term" deal={deal} field="termYears" suffix="yrs" set={set} />
        <NumRow label="TCV (base term)" deal={deal} field="tcv" scale={1e6} suffix="$M" set={set} />
        <NumRow label="Rent yr 1 (optional)" deal={deal} field="annualRentYr1" scale={1e6} suffix="$M" set={set} />
        <NumRow label="Escalator" deal={deal} field="escalatorPct" suffix="%" step={0.25} set={set} />
        <SelectRow
          label="Structure"
          value={deal.leaseStructure || ""}
          options={[["", "unknown"], ["NNN", "NNN"], ["Hosting", "Hosting"], ["Gross", "Gross"]]}
          onChange={(v) => set({ leaseStructure: v || null, leaseStructureBasis: v ? "stated" : "unknown" })}
        />
        <SelectRow
          label="Take-or-pay"
          value={deal.takeOrPay == null ? "" : deal.takeOrPay ? "yes" : "no"}
          options={[["", "unknown"], ["yes", "yes"], ["no", "no"]]}
          onChange={(v) => set({ takeOrPay: v === "" ? null : v === "yes" })}
        />
        <NumRow label="Developer capex" deal={deal} field="developerCapexTotal" scale={1e6} suffix="$M" set={set} />
        <NumRow label="Tenant-funded capex" deal={deal} field="tenantFundedCapex" scale={1e6} suffix="$M" set={set} />
        <NumRow label="Backstop amount" deal={deal} field="backstopAmount" scale={1e6} suffix="$M" set={(p) => set({ ...p, backstop: deal.backstop ? { ...deal.backstop, amount: p.backstopAmount ?? null } : p.backstopAmount != null ? { provider: "Undisclosed", amount: p.backstopAmount } : null })} />
        <NumRow label="Renewal options" deal={deal} field="renewalOptionsCount" suffix="x" set={(p) => set({ ...p, renewalOptions: p.renewalOptionsCount ? `${p.renewalOptionsCount} x 5-year` : null })} />
        <QuarterRow label="First rent" deal={deal} field="deliveryStart" set={set} allowUnknown={false} />
        <QuarterRow label="Full delivery" deal={deal} field="fullDelivery" set={set} allowUnknown />
      </div>

      {/* Live outputs */}
      {ok && (
        <div style={{ background: "var(--fill)", borderRadius: 10, padding: "8px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12 }}>
          <span className="muted">Yield on cost</span><span className="mono" style={{ textAlign: "right" }}>{fmtPct(o.yieldOnCost)}</span>
          <span className="muted">NPV @ {result.inputs.discountRatePct}%</span><span className="mono" style={{ textAlign: "right" }}>{fmtUsd(o.projectNpv)}</span>
          <span className="muted">Unlevered IRR</span><span className="mono" style={{ textAlign: "right" }}>{o.projectIrr != null ? fmtPct(o.projectIrr) : "n/a"}</span>
          <span className="muted">Payback</span><span className="mono" style={{ textAlign: "right" }}>{fmtYears(o.paybackYears)}</span>
        </div>
      )}
      {!valid && (
        <p className="field-hint" style={{ color: "var(--tier-3)" }}>Needs critical IT MW, term, and TCV (or year-1 rent) to score.</p>
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
        <DealSelect value={deal.id} library={library} customs={customs} onChange={onSelect} />
        <button className="btn btn-primary btn-sm" onClick={onDone} disabled={!valid}>Done</button>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>Clear</button>
      </div>
    </section>
  );
}