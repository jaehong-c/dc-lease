import { fmtUsd, fmtRate, fmtPct, fmtYears } from "./economics";

function esc(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv({ compare, deals }) {
  const rows = compare.results.filter((r) => r.ok);
  const dealOf = (id) => deals.find((d) => d.id === id) || {};

  const header = ["Metric", ...rows.map((r) => `${dealOf(r.id).developerTicker} / ${dealOf(r.id).tenantShort || dealOf(r.id).tenant}`)];

  const lines = [
    ["Campus", ...rows.map((r) => `${dealOf(r.id).campus}, ${dealOf(r.id).state}`)],
    ["Announced", ...rows.map((r) => dealOf(r.id).announcedDate)],
    ["Critical IT MW", ...rows.map((r) => r.inputs.mw)],
    ["Gross MW", ...rows.map((r) => r.inputs.grossMw ?? "")],
    ["Term (yrs)", ...rows.map((r) => r.inputs.termYears)],
    ["Lease structure", ...rows.map((r) => r.inputs.leaseStructure ?? "unknown")],
    ["Escalator (%)", ...rows.map((r) => `${r.inputs.escalatorPct} (${r.flags.escalator})`)],
    ["TCV base term", ...rows.map((r) => `${fmtUsd(r.outputs.tcv)} (${r.flags.tcv})`)],
    ["Rent yr 1", ...rows.map((r) => `${fmtUsd(r.outputs.rentYr1)} (${r.flags.rent})`)],
    ["Rate yr 1 ($/kW/mo)", ...rows.map((r) => fmtRate(r.outputs.rateYr1))],
    ["Rate avg over term ($/kW/mo)", ...rows.map((r) => fmtRate(r.outputs.rateAvg))],
    ["Rate avg on gross MW ($/kW/mo)", ...rows.map((r) => fmtRate(r.outputs.rateAvgGross))],
    ["NOI yr 1", ...rows.map((r) => `${fmtUsd(r.outputs.noiYr1)} (${r.flags.noi})`)],
    ["Developer net capex", ...rows.map((r) => `${fmtUsd(r.inputs.developerNetCapex)} (${r.flags.capex})`)],
    ["Tenant-funded capex", ...rows.map((r) => fmtUsd(r.inputs.tenantFunded || 0))],
    ["Yield on cost", ...rows.map((r) => fmtPct(r.outputs.yieldOnCost))],
    ["YoC vs tier band", ...rows.map((r) => r.outputs.yocVsBand ?? "")],
    [`Project NPV @ ${compare.assumptions.discountRatePct}%`, ...rows.map((r) => fmtUsd(r.outputs.projectNpv))],
    ["Unlevered IRR", ...rows.map((r) => fmtPct(r.outputs.projectIrr))],
    ["Payback", ...rows.map((r) => fmtYears(r.outputs.paybackYears))],
    ["First rent", ...rows.map((r) => dealOf(r.id).deliveryStart ?? "")],
    ["Full delivery", ...rows.map((r) => dealOf(r.id).fullDelivery ?? "undisclosed")],
    ["Tenant credit tier", ...rows.map((r) => r.credit.tenantTier)],
    ["Effective credit tier", ...rows.map((r) => `${r.credit.effectiveTier} (${r.credit.basis})`)],
    ["Backstop", ...rows.map((r) => (r.credit.backstopProvider ? `${r.credit.backstopProvider}${r.credit.coverage != null && r.credit.coverage < 1 ? ` ${fmtPct(r.credit.coverage, 0)}` : ""}` : ""))],
    ["Score: pricing", ...rows.map((r) => r.scorecard.axes.pricing.score ?? "")],
    ["Score: credit", ...rows.map((r) => r.scorecard.axes.credit.score ?? "")],
    ["Score: term & structure", ...rows.map((r) => r.scorecard.axes.termStructure.score ?? "")],
    ["Score: capex efficiency", ...rows.map((r) => r.scorecard.axes.capexEfficiency.score ?? "")],
    ["Score: delivery", ...rows.map((r) => r.scorecard.axes.delivery.score ?? "")],
    ["Composite", ...rows.map((r) => r.scorecard.composite ?? "")],
    ["Verdict", ...rows.map((r) => compare.verdicts[r.id])],
    ["Data gaps", ...rows.map((r) => (r.gaps || []).map((g) => `${g.field}:${g.basis}`).join("; "))],
    [],
    ["Assumptions"],
    ["Analysis date", compare.assumptions.analysisDate],
    ["Discount rate (%)", compare.assumptions.discountRatePct],
    ["Assumed capex per critical IT MW", compare.assumptions.capexPerCriticalMwUsd],
    ["Default escalator (%)", compare.assumptions.escalatorDefaultPct],
    ["Opex share non-NNN (%)", compare.assumptions.opexPctOfRevenue],
    ["Construction window (months)", compare.assumptions.constructionMonthsBeforeDelivery],
    ["Rent credit cap (%)", compare.assumptions.rentCreditCapPct],
    [],
    ["Source", "DC Lease Comparator, dc-lease.vercel.app. Comps limited to publicly disclosed leases. Base term only, no terminal value, no leverage."],
  ];

  return [header, ...lines].map((row) => row.map(esc).join(",")).join("\n");
}

export function downloadCsv(csv, filename = "dc-lease-comparison.csv") {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}