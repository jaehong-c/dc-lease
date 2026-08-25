"use client";

const BASIS_OPTIONS = ["stated", "assumed", "unknown"];

const QUARTERS = (() => {
  const out = [];
  for (let y = 2024; y <= 2033; y++) for (let q = 1; q <= 4; q++) out.push(`${y}-Q${q}`);
  return out;
})();

function Field({ label, hint, children }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

// Numeric input with a basis selector. "unknown" clears the value.
function NumField({ label, hint, value, basis, onChange, scale = 1, step, placeholder, suffix }) {
  const shown = value == null ? "" : value / scale;
  const unknown = basis === "unknown";
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 112px", gap: 6 }}>
        <div style={{ position: "relative" }}>
          <input
            type="number"
            className="field field-mono"
            step={step}
            value={shown}
            placeholder={unknown ? "unknown" : placeholder}
            disabled={unknown}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value) * scale;
              onChange({ value: v, basis: basis === "unknown" ? "stated" : basis });
            }}
            style={{ paddingRight: suffix ? 44 : 12, opacity: unknown ? 0.5 : 1 }}
          />
          {suffix && (
            <span className="mono muted" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12 }}>
              {suffix}
            </span>
          )}
        </div>
        <select
          className="field-select"
          value={basis || "stated"}
          onChange={(e) => {
            const b = e.target.value;
            onChange({ value: b === "unknown" ? null : value, basis: b });
          }}
        >
          {BASIS_OPTIONS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
    </Field>
  );
}

function QuarterField({ label, hint, value, basis, onChange, allowUnknown = true }) {
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 112px", gap: 6 }}>
        <select className="field-select field-mono" value={value || ""} onChange={(e) => onChange({ value: e.target.value || null, basis })}>
          {allowUnknown && <option value="">unknown</option>}
          {QUARTERS.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        <select className="field-select" value={basis || "stated"} onChange={(e) => onChange({ value, basis: e.target.value })}>
          <option value="stated">stated</option>
          <option value="assumed">assumed</option>
        </select>
      </div>
    </Field>
  );
}

export default function CustomDealForm({ deal, onChange, onDone, onRemove }) {
  const set = (patch) => onChange({ ...deal, ...patch });
  const num = (key) => ({ value: deal[key], basis: deal[`${key}Basis`] || (deal[key] == null ? "unknown" : "stated") });
  const setNum = (key) => ({ value, basis }) => set({ [key]: value, [`${key}Basis`]: basis });

  const valid = deal.criticalItMw > 0 && deal.termYears > 0 && (deal.tcv != null || deal.annualRentYr1 != null);

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="eyebrow">Custom deal</div>
          <div className="card-title" style={{ marginTop: 4 }}>{deal.developerTicker || "Developer"} / {deal.tenant || "Tenant"}</div>
          <div className="card-sub">Mark each number as stated, assumed, or unknown. Unknown inputs fall back to the global assumptions and are listed under Data gaps.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onRemove}>Remove</button>
          <button className="btn btn-primary btn-sm" onClick={onDone} disabled={!valid}>Done</button>
        </div>
      </div>

      {/* Identity */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
        <Field label="Developer ticker">
          <input className="field" value={deal.developerTicker || ""} placeholder="e.g. IREN" onChange={(e) => set({ developerTicker: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Tenant">
          <input className="field" value={deal.tenant || ""} placeholder="e.g. Microsoft" onChange={(e) => set({ tenant: e.target.value, tenantShort: e.target.value })} />
        </Field>
        <Field label="Campus">
          <input className="field" value={deal.campus || ""} placeholder="Site name" onChange={(e) => set({ campus: e.target.value })} />
        </Field>
        <Field label="State">
          <input className="field" value={deal.state || ""} placeholder="TX" maxLength={2} onChange={(e) => set({ state: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Announced">
          <input className="field field-mono" type="date" value={deal.announcedDate || ""} onChange={(e) => set({ announcedDate: e.target.value })} />
        </Field>
      </div>

      <div className="divider" />

      {/* Size and term */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Size and term</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <NumField label="Critical IT MW" {...num("criticalItMw")} onChange={setNum("criticalItMw")} suffix="MW" placeholder="required" />
          <NumField label="Gross MW" hint="Context only" {...num("grossMw")} onChange={setNum("grossMw")} suffix="MW" />
          <NumField label="Term" {...num("termYears")} onChange={setNum("termYears")} suffix="yrs" placeholder="required" />
          <NumField label="Escalator" hint="Blank uses the default" {...num("escalatorPct")} onChange={setNum("escalatorPct")} suffix="%" step={0.25} />
        </div>
      </div>

      {/* Economics */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Economics · enter TCV or year-1 rent</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <NumField label="TCV, base term" {...num("tcv")} onChange={setNum("tcv")} scale={1e6} suffix="$M" placeholder="e.g. 9800" />
          <NumField label="Rent, year 1" hint="Overrides TCV if both given" {...num("annualRentYr1")} onChange={setNum("annualRentYr1")} scale={1e6} suffix="$M" />
          <Field label="Lease structure">
            <select className="field-select" value={deal.leaseStructure || ""} onChange={(e) => set({ leaseStructure: e.target.value || null, leaseStructureBasis: e.target.value ? "stated" : "unknown" })}>
              <option value="">unknown</option>
              <option value="NNN">NNN</option>
              <option value="Hosting">Hosting</option>
              <option value="Gross">Gross</option>
            </select>
          </Field>
          <Field label="Take-or-pay">
            <select className="field-select" value={deal.takeOrPay == null ? "" : deal.takeOrPay ? "yes" : "no"} onChange={(e) => set({ takeOrPay: e.target.value === "" ? null : e.target.value === "yes" })}>
              <option value="">unknown</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Capital and delivery */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Capital and delivery</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <NumField label="Developer capex, total" hint="Blank uses assumed $/MW" {...num("developerCapexTotal")} onChange={setNum("developerCapexTotal")} scale={1e6} suffix="$M" />
          <NumField label="Tenant-funded capex" hint="Repaid via rent credits" {...num("tenantFundedCapex")} onChange={setNum("tenantFundedCapex")} scale={1e6} suffix="$M" />
          <QuarterField label="First rent" value={deal.deliveryStart} basis={deal.deliveryStartBasis || "stated"} onChange={({ value, basis }) => set({ deliveryStart: value, deliveryStartBasis: basis })} allowUnknown={false} />
          <QuarterField label="Full delivery" value={deal.fullDelivery} basis={deal.fullDeliveryBasis || "stated"} onChange={({ value, basis }) => set({ fullDelivery: value, fullDeliveryBasis: basis })} />
        </div>
      </div>

      {/* Credit */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Counterparty</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <Field label="Tenant credit tier">
            <select className="field-select" value={deal.tenantCreditTier || 2} onChange={(e) => set({ tenantCreditTier: Number(e.target.value) })}>
              <option value={1}>Tier 1 · Investment grade</option>
              <option value={2}>Tier 2 · Well-funded private</option>
              <option value={3}>Tier 3 · Speculative</option>
            </select>
          </Field>
          <Field label="Backstop provider" hint="Blank if none">
            <input
              className="field"
              value={deal.backstop?.provider || ""}
              placeholder="e.g. Google"
              onChange={(e) => {
                const provider = e.target.value;
                set({ backstop: provider ? { provider, amount: deal.backstop?.amount ?? null, scope: "Lease obligations" } : null });
              }}
            />
          </Field>
          <NumField
            label="Backstop amount"
            hint="Blank treats support as full"
            value={deal.backstop?.amount ?? null}
            basis={deal.backstop?.amount == null ? "unknown" : deal.backstopAmountBasis || "stated"}
            onChange={({ value, basis }) => set({ backstop: deal.backstop ? { ...deal.backstop, amount: value } : { provider: "", amount: value }, backstopAmountBasis: basis })}
            scale={1e6}
            suffix="$M"
          />
          <NumField label="Renewal options" {...num("renewalOptionsCount")} onChange={({ value, basis }) => set({ renewalOptionsCount: value, renewalOptions: value ? `${value} x 5-year` : null })} suffix="x" />
        </div>
      </div>

      {!valid && (
        <p className="field-hint" style={{ color: "var(--tier-3)" }}>
          Needs critical IT MW, term, and either TCV or year-1 rent before it can be scored.
        </p>
      )}
    </section>
  );
}