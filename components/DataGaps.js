"use client";

const SHADES = ["var(--bar-5)", "var(--bar-3)", "var(--bar-2)"];

const FIELD_LABEL = {
  criticalItMw: "Critical IT MW",
  escalatorPct: "Escalator",
  annualRentYr1: "Year-1 rent",
  tcv: "Contract value",
  leaseStructure: "Lease structure",
  developerCapexTotal: "Developer capex",
  deliveryStart: "First delivery",
  fullDelivery: "Full delivery",
};

const AFFECT_LABEL = {
  rate: "rate",
  rentYr1: "yr-1 rent",
  tcv: "TCV",
  noi: "NOI",
  yoc: "yield on cost",
  npv: "NPV",
  irr: "IRR",
  payback: "payback",
  delivery: "delivery score",
  termStructure: "term score",
  capexEfficiency: "capex score",
  everything: "all outputs",
};

function chipClass(basis) {
  if (basis === "derived") return "chip chip-derived";
  return "chip chip-unverified";
}

export default function DataGaps({ results, deals }) {
  const rows = results
    .map((r, i) => ({ r, deal: deals.find((d) => d.id === r.id), shade: SHADES[i] || SHADES[0] }))
    .filter((x) => x.deal);

  const total = rows.reduce((n, x) => n + (x.r.gaps?.length || 0), 0);

  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div className="card-title">Data gaps</div>
          <div className="card-sub">Inputs that are derived, assumed, or unverified, and what they move.</div>
        </div>
        <span className="mono muted" style={{ fontSize: 12 }}>{total}</span>
      </div>

      {rows.length === 0 && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>No deals selected.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
        {rows.map((x) => (
          <div key={x.r.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: x.shade, display: "inline-block" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {x.deal.developerTicker} / {x.deal.tenantShort || x.deal.tenant}
              </span>
            </div>
            {(!x.r.gaps || x.r.gaps.length === 0) && (
              <p className="muted" style={{ fontSize: 12.5, paddingLeft: 16 }}>All inputs stated.</p>
            )}
            {x.r.gaps?.map((g, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "6px 0 6px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div>
                  <span style={{ fontSize: 12.5 }}>{FIELD_LABEL[g.field] || g.field}</span>
                  <span className="muted" style={{ fontSize: 11.5, marginLeft: 6 }}>
                    moves {g.affects.map((a) => AFFECT_LABEL[a] || a).join(", ")}
                  </span>
                </div>
                <span className={chipClass(g.basis)}>{g.basis}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}