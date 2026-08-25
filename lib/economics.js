// lib/economics.js
// Deterministic lease economics engine for DC Lease Comparator.
// All scoring and derivation happens here. The AI memo only interprets outputs.
// Perspective: developer / landlord. Higher rent, stronger credit, faster delivery score higher.

// ---------------------------------------------------------------------------
// Assumptions (user-adjustable in UI)
// ---------------------------------------------------------------------------

export const DEFAULT_ASSUMPTIONS = {
  analysisDate: "2026-08-24", // t = 0 for NPV and delivery timing
  discountRatePct: 10, // target unlevered return, not WACC
  escalatorDefaultPct: 2.5, // applied only when a deal does not disclose its escalator
  capexPerCriticalMwUsd: 11000000, // applied only when developer capex is undisclosed
  opexPctOfRevenue: 22, // applied only when structure is not NNN (hosting, gross, unknown)
  constructionMonthsBeforeDelivery: 18, // capex spend window ending at delivery start
  rentCreditCapPct: 50, // tenant-funded capex repaid via rent credit, max share of monthly rent
};

export const WEIGHTS = {
  pricing: 0.25,
  credit: 0.25,
  termStructure: 0.15,
  capexEfficiency: 0.2,
  delivery: 0.15,
};

// Illustrative expected yield-on-cost bands by effective credit tier (developer view).
// Heuristic, not a market survey. Used only to ask "is the yield paying for the credit risk?"
export const YOC_BAND_BY_TIER = {
  1: { low: 0.1, high: 0.125 },
  2: { low: 0.125, high: 0.15 },
  3: { low: 0.15, high: 0.2 },
};

export const TIER_LABEL = {
  1: "Tier 1 · Investment grade",
  2: "Tier 2 · Well-funded private",
  3: "Tier 3 · Speculative",
};

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export function parseQuarter(q) {
  // "2027-Q3" -> 2027.5 (start of quarter as fractional year). null passthrough.
  if (!q || typeof q !== "string") return null;
  const m = q.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return null;
  return Number(m[1]) + (Number(m[2]) - 1) * 0.25;
}

export function parseDate(d) {
  // "2026-08-24" -> fractional year
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const year = dt.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (dt.getTime() - start) / (end - start);
}

export function formatQuarter(fracYear) {
  if (fracYear == null) return null;
  const y = Math.floor(fracYear);
  const q = Math.floor((fracYear - y) * 4) + 1;
  return `${y}-Q${q}`;
}

// ---------------------------------------------------------------------------
// Pure financial functions
// ---------------------------------------------------------------------------

export function annuityFactor(escalatorPct, years) {
  // Sum of (1+e)^(t-1) for t = 1..years
  const e = (escalatorPct || 0) / 100;
  if (years <= 0) return 0;
  if (Math.abs(e) < 1e-9) return years;
  return (Math.pow(1 + e, years) - 1) / e;
}

export function deriveYear1Rent({ annualRentYr1, tcv, averageAnnualRevenue, termYears, escalatorPct }) {
  // Returns { rentYr1, tcv, basis }
  if (!termYears) return { rentYr1: null, tcv: null, basis: "unavailable" };
  const af = annuityFactor(escalatorPct, termYears);

  if (annualRentYr1 != null) {
    return { rentYr1: annualRentYr1, tcv: annualRentYr1 * af, basis: "stated" };
  }
  if (tcv != null) {
    return { rentYr1: tcv / af, tcv, basis: "derived" };
  }
  if (averageAnnualRevenue != null) {
    const t = averageAnnualRevenue * termYears;
    return { rentYr1: t / af, tcv: t, basis: "derived" };
  }
  return { rentYr1: null, tcv: null, basis: "unavailable" };
}

export function ratePerKwMonth(annualUsd, mw) {
  if (annualUsd == null || !mw) return null;
  return annualUsd / (mw * 1000) / 12;
}

export function npv(cashflows, annualRate) {
  // cashflows: [{ t: fractional years from t0, amount }]
  const r = annualRate;
  return cashflows.reduce((acc, cf) => acc + cf.amount / Math.pow(1 + r, cf.t), 0);
}

export function irr(cashflows, lo = -0.9, hi = 1.0, iters = 80) {
  // Bisection on NPV(r) = 0. Returns null if no sign change.
  const f = (r) => npv(cashflows, r);
  let fLo = f(lo);
  let fHi = f(hi);
  if (Number.isNaN(fLo) || Number.isNaN(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (fMid * fLo > 0) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
      fHi = fMid;
    }
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// Deal evaluation
// ---------------------------------------------------------------------------

function isNnn(structure) {
  return typeof structure === "string" && structure.toUpperCase().startsWith("NNN");
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function monthsBetween(fromFrac, toFrac) {
  if (fromFrac == null || toFrac == null) return null;
  return Math.round((toFrac - fromFrac) * 12);
}

export function evaluateDeal(deal, assumptionsIn = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptionsIn };
  const gaps = []; // { field, basis, affects: [] }
  const flags = {}; // output -> basis label

  const mw = deal.criticalItMw ?? null;
  const grossMw = deal.grossMw ?? null;
  const termYears = deal.termYears ?? null;

  if (!mw || !termYears) {
    return {
      id: deal.id,
      ok: false,
      reason: "criticalItMw and termYears are required",
      gaps: [
        !mw && { field: "criticalItMw", basis: "missing", affects: ["everything"] },
        !termYears && { field: "termYears", basis: "missing", affects: ["everything"] },
      ].filter(Boolean),
    };
  }

  if (deal.criticalItMwBasis && deal.criticalItMwBasis !== "stated") {
    gaps.push({ field: "criticalItMw", basis: deal.criticalItMwBasis, affects: ["rate", "yoc", "npv"] });
  }
  if (deal.termYearsBasis && deal.termYearsBasis !== "stated") {
    gaps.push({ field: "termYears", basis: deal.termYearsBasis, affects: ["rentYr1", "tcv", "npv", "termStructure"] });
  }
  if (deal.deliveryStartBasis && deal.deliveryStartBasis !== "stated") {
    gaps.push({ field: "deliveryStart", basis: deal.deliveryStartBasis, affects: ["npv", "delivery"] });
  }
  if (deal.fullDelivery != null && deal.fullDeliveryBasis && deal.fullDeliveryBasis !== "stated") {
    gaps.push({ field: "fullDelivery", basis: deal.fullDeliveryBasis, affects: ["npv", "delivery"] });
  }

  // --- Escalator
  let escalatorPct = deal.escalatorPct;
  let escalatorBasis = deal.escalatorBasis || (escalatorPct != null ? "stated" : null);
  if (escalatorPct == null) {
    escalatorPct = a.escalatorDefaultPct;
    escalatorBasis = "assumed";
    gaps.push({ field: "escalatorPct", basis: "assumed", affects: ["rentYr1", "npv", "termStructure"] });
  }
  flags.escalator = escalatorBasis;

  // --- Rent stream
  const rent = deriveYear1Rent({
    annualRentYr1: deal.annualRentYr1,
    tcv: deal.tcv,
    averageAnnualRevenue: deal.averageAnnualRevenue,
    termYears,
    escalatorPct,
  });
  flags.rent = rent.basis === "stated" && deal.annualRentYr1Basis ? deal.annualRentYr1Basis : rent.basis;
  flags.tcv = deal.tcv != null ? deal.tcvBasis || "stated" : rent.tcv != null ? "derived" : "unavailable";
  if (rent.basis === "derived") gaps.push({ field: "annualRentYr1", basis: "derived", affects: ["rate", "yoc"] });
  if (rent.basis === "stated" && deal.annualRentYr1Basis && deal.annualRentYr1Basis !== "stated") {
    gaps.push({ field: "annualRentYr1", basis: deal.annualRentYr1Basis, affects: ["rate", "tcv", "yoc", "npv"] });
  }
  if (deal.tcv != null && deal.tcvBasis && deal.tcvBasis !== "stated") {
    gaps.push({ field: "tcv", basis: deal.tcvBasis, affects: ["rentYr1", "rate", "yoc", "npv"] });
  }
  if (deal.tcv == null && deal.averageAnnualRevenue != null) {
    gaps.push({ field: "tcv", basis: "derived", affects: ["tcv", "npv"] });
  }

  const rentYr1 = rent.rentYr1;
  const tcv = rent.tcv;
  const avgAnnualRent = tcv != null ? tcv / termYears : null;

  // --- Rates
  const rateYr1 = ratePerKwMonth(rentYr1, mw);
  const rateAvg = ratePerKwMonth(avgAnnualRent, mw);
  const rateAvgGross = grossMw ? ratePerKwMonth(avgAnnualRent, grossMw) : null;

  // --- NOI
  const nnn = isNnn(deal.leaseStructure);
  let opexPct = 0;
  let noiBasis = "stated";
  if (!nnn) {
    opexPct = a.opexPctOfRevenue / 100;
    noiBasis = "assumed";
    gaps.push({
      field: "leaseStructure",
      basis: deal.leaseStructure ? deal.leaseStructureBasis || "stated" : "unknown",
      affects: ["noi", "yoc", "npv"],
    });
  } else if (deal.leaseStructureBasis && deal.leaseStructureBasis !== "stated") {
    gaps.push({ field: "leaseStructure", basis: deal.leaseStructureBasis, affects: ["noi", "yoc"] });
  }
  const noiYr1 = rentYr1 != null ? rentYr1 * (1 - opexPct) : null;
  flags.noi = noiBasis;

  // --- Capex
  // Priority: stated developer total > deal-specific developer $/MW override > global $/MW assumption.
  // capexPerMwOverride is the developer's own spend per critical IT MW (tenant-funded capex is separate).
  const tenantFunded = deal.tenantFundedCapex ?? 0;
  let capexTotal;
  let developerNetCapex;
  let capexBasis;
  if (deal.developerCapexTotal != null) {
    capexTotal = deal.developerCapexTotal;
    developerNetCapex = Math.max(0, capexTotal - tenantFunded);
    capexBasis = deal.developerCapexTotalBasis || "stated";
    if (capexBasis !== "stated") {
      gaps.push({ field: "developerCapexTotal", basis: capexBasis, affects: ["yoc", "npv", "irr", "payback", "capexEfficiency"] });
    }
  } else if (deal.capexPerMwOverride != null) {
    developerNetCapex = mw * deal.capexPerMwOverride;
    capexTotal = developerNetCapex + tenantFunded;
    capexBasis = deal.capexPerMwOverrideBasis || "deal-specific";
    gaps.push({ field: "developerCapexTotal", basis: capexBasis, affects: ["yoc", "npv", "irr", "payback", "capexEfficiency"] });
  } else {
    capexTotal = mw * a.capexPerCriticalMwUsd;
    developerNetCapex = Math.max(0, capexTotal - tenantFunded);
    capexBasis = "assumed";
    gaps.push({ field: "developerCapexTotal", basis: "assumed", affects: ["yoc", "npv", "irr", "payback", "capexEfficiency"] });
  }
  flags.capex = capexBasis;
  if (tenantFunded > 0) flags.tenantFundedCapex = deal.tenantFundedCapexBasis || "stated";

  // --- Yields
  const yieldOnTotalCost = noiYr1 != null && capexTotal > 0 ? noiYr1 / capexTotal : null;
  const yieldOnCost = noiYr1 != null && developerNetCapex > 0 ? noiYr1 / developerNetCapex : null;

  // --- Timing
  const t0 = parseDate(a.analysisDate);
  const deliveryStart = parseQuarter(deal.deliveryStart);
  const fullDelivery = parseQuarter(deal.fullDelivery) ?? deliveryStart;
  const monthsToFirstRent = monthsBetween(t0, deliveryStart);
  const monthsToFull = monthsBetween(t0, fullDelivery);
  if (deliveryStart == null) gaps.push({ field: "deliveryStart", basis: "missing", affects: ["npv", "delivery"] });
  if (deal.fullDelivery == null) gaps.push({ field: "fullDelivery", basis: "unknown", affects: ["npv", "delivery"] });

  // --- Cash flows (monthly, base term only, no terminal value)
  const cash = buildCashFlows({
    t0,
    deliveryStart,
    fullDelivery,
    termYears,
    rentYr1,
    escalatorPct,
    opexPct,
    developerNetCapex,
    tenantFunded,
    rentCreditCap: a.rentCreditCapPct / 100,
    constructionMonths: a.constructionMonthsBeforeDelivery,
  });

  const r = a.discountRatePct / 100;
  const leaseNpv = cash ? npv(cash.noiFlows, r) : null;
  const projectNpv = cash ? npv([...cash.noiFlows, ...cash.capexFlows], r) : null;
  const projectIrr = cash ? irr([...cash.noiFlows, ...cash.capexFlows]) : null;
  const paybackYears = cash ? computePayback(cash) : null;

  // --- Effective credit
  const credit = effectiveCredit(deal, tcv);

  // --- Scorecard
  const scorecard = buildScorecard({
    rateYr1,
    credit,
    termYears,
    escalatorPct,
    escalatorBasis,
    takeOrPay: deal.takeOrPay,
    renewalOptionsCount: deal.renewalOptionsCount,
    yieldOnCost,
    capexBasis,
    monthsToFull,
    fullDeliveryKnown: deal.fullDelivery != null,
  });

  // --- Yield vs credit premium check
  const band = YOC_BAND_BY_TIER[credit.effectiveTier] || null;
  const yocVsBand =
    yieldOnCost != null && band
      ? yieldOnCost < band.low
        ? "below"
        : yieldOnCost > band.high
        ? "above"
        : "within"
      : null;

  return {
    id: deal.id,
    ok: true,
    inputs: {
      mw,
      grossMw,
      termYears,
      escalatorPct,
      leaseStructure: deal.leaseStructure || null,
      nnn,
      opexPct,
      capexTotal,
      tenantFunded,
      developerNetCapex,
      discountRatePct: a.discountRatePct,
      analysisDate: a.analysisDate,
    },
    outputs: {
      rentYr1,
      avgAnnualRent,
      tcv,
      rateYr1,
      rateAvg,
      rateAvgGross,
      noiYr1,
      yieldOnCost,
      yieldOnTotalCost,
      leaseNpv,
      projectNpv,
      projectIrr,
      paybackYears,
      monthsToFirstRent,
      monthsToFull,
      yocVsBand,
      yocBand: band,
    },
    credit,
    scorecard,
    flags,
    gaps,
    cash,
  };
}

// ---------------------------------------------------------------------------
// Cash flow construction
// ---------------------------------------------------------------------------

export function buildCashFlows({
  t0,
  deliveryStart,
  fullDelivery,
  termYears,
  rentYr1,
  escalatorPct,
  opexPct,
  developerNetCapex,
  tenantFunded,
  rentCreditCap,
  constructionMonths,
}) {
  if (t0 == null || deliveryStart == null || rentYr1 == null) return null;
  const e = (escalatorPct || 0) / 100;
  const startM = Math.max(0, Math.round((deliveryStart - t0) * 12));
  const fullM = Math.max(startM, Math.round((fullDelivery - t0) * 12));
  const rampM = Math.max(0, fullM - startM);
  const termM = Math.round(termYears * 12);

  const noiFlows = [];
  let creditRemaining = tenantFunded || 0;
  let cumNoi = 0;
  const cumulative = [];

  // Lease term clock starts at first delivery. Rent on delivered share of capacity, escalating annually.
  for (let m = startM; m < startM + termM; m++) {
    const leaseYear = Math.floor((m - startM) / 12); // 0-indexed
    const delivered = rampM === 0 ? 1 : clamp((m - startM + 1) / (rampM + 1), 0, 1);
    const rentMonthly = (rentYr1 / 12) * Math.pow(1 + e, leaseYear) * delivered;
    let credit = 0;
    if (creditRemaining > 0) {
      credit = Math.min(creditRemaining, rentMonthly * rentCreditCap);
      creditRemaining -= credit;
    }
    const noi = (rentMonthly - credit) * (1 - opexPct);
    cumNoi += noi;
    noiFlows.push({ t: m / 12, amount: noi });
    cumulative.push({ t: m / 12, cumNoi });
  }

  // Capex spread evenly over construction window ending at first delivery, floored at t0.
  const capexFlows = [];
  const cStart = Math.max(0, startM - constructionMonths);
  const cEnd = Math.max(cStart + 1, startM);
  const perMonth = developerNetCapex / (cEnd - cStart);
  for (let m = cStart; m < cEnd; m++) {
    capexFlows.push({ t: m / 12, amount: -perMonth });
  }

  return { noiFlows, capexFlows, cumulative, startM, fullM, termM, developerNetCapex };
}

function computePayback(cash) {
  const target = cash.developerNetCapex;
  if (!target) return null;
  const hit = cash.cumulative.find((c) => c.cumNoi >= target);
  return hit ? hit.t : null;
}

// ---------------------------------------------------------------------------
// Effective credit
// ---------------------------------------------------------------------------

export function effectiveCredit(deal, tcv) {
  const tenantTier = deal.tenantCreditTier ?? 3;
  const bs = deal.backstop || null;
  let coverage = null;
  let effectiveTier = deal.effectiveCreditTier ?? tenantTier;
  let basis = deal.effectiveCreditBasis || (deal.effectiveCreditTier != null ? "stated" : "derived");

  if (bs && bs.amount != null && tcv) {
    coverage = clamp(bs.amount / tcv, 0, 1);
  } else if (bs && bs.amount == null) {
    coverage = 1; // scope-level support with undisclosed amount, treat as full for scoring, flag it
    if (deal.effectiveCreditTier == null) effectiveTier = 1;
    basis = deal.effectiveCreditTier != null && basis === "stated" ? "stated" : "assumed";
  }

  // Score 1..5 on credit. Tier 1 = 5, Tier 2 = 3, Tier 3 = 1. Partial backstop blends.
  const tierScore = { 1: 5, 2: 3, 3: 1 };
  let score;
  if (coverage != null && coverage < 1) {
    score = coverage * 5 + (1 - coverage) * tierScore[tenantTier];
    effectiveTier = coverage >= 0.5 ? 1 : tenantTier === 3 ? 2 : tenantTier;
  } else {
    score = tierScore[effectiveTier] ?? 1;
  }

  return {
    tenantTier,
    effectiveTier,
    basis,
    backstopProvider: bs ? bs.provider : null,
    backstopScope: bs ? bs.scope : null,
    backstopAmount: bs ? bs.amount ?? null : null,
    coverage,
    score: Number(score.toFixed(2)),
    label: TIER_LABEL[effectiveTier],
  };
}

// ---------------------------------------------------------------------------
// Scorecard (developer view)
// ---------------------------------------------------------------------------

export function buildScorecard({
  rateYr1,
  credit,
  termYears,
  escalatorPct,
  escalatorBasis,
  takeOrPay,
  renewalOptionsCount,
  yieldOnCost,
  capexBasis,
  monthsToFull,
  fullDeliveryKnown,
}) {
  // Pricing: year-1 $/kW/month bands
  let pricing = null;
  if (rateYr1 != null) {
    pricing = rateYr1 < 90 ? 1 : rateYr1 < 110 ? 2 : rateYr1 < 130 ? 3 : rateYr1 < 160 ? 4 : 5;
  }

  // Credit
  const creditScore = credit ? credit.score : null;

  // Term and structure
  let ts = 1;
  ts += termYears >= 15 ? 1 : termYears >= 10 ? 0.5 : 0;
  ts += escalatorBasis === "stated" ? (escalatorPct >= 2.5 ? 1 : 0.5) : 0;
  ts += takeOrPay ? 1 : 0;
  ts += renewalOptionsCount >= 2 ? 1 : renewalOptionsCount >= 1 ? 0.5 : 0;
  const termStructure = clamp(ts, 1, 5);

  // Capex efficiency: yield on developer net cost
  let capexEfficiency = null;
  if (yieldOnCost != null) {
    const y = yieldOnCost;
    capexEfficiency = y < 0.09 ? 1 : y < 0.11 ? 2 : y < 0.13 ? 3 : y < 0.15 ? 4 : 5;
  }

  // Delivery: months from analysis date to full delivery.
  // If full delivery is undisclosed, cap at 3 so an open-ended schedule is never rewarded.
  let delivery = null;
  if (monthsToFull != null) {
    const m = monthsToFull;
    delivery = m <= 6 ? 5 : m <= 12 ? 4 : m <= 24 ? 3 : m <= 36 ? 2 : 1;
    if (!fullDeliveryKnown) delivery = Math.min(delivery, 3);
  }

  const axes = {
    pricing: { score: pricing, basis: rateYr1 != null ? "computed" : "unavailable" },
    credit: { score: creditScore, basis: credit ? credit.basis : "unavailable" },
    termStructure: { score: termStructure, basis: escalatorBasis === "assumed" ? "partly assumed" : "stated" },
    capexEfficiency: { score: capexEfficiency, basis: capexBasis },
    delivery: { score: delivery, basis: fullDeliveryKnown ? "stated" : "partly unknown" },
  };

  let weighted = 0;
  let weightSum = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const s = axes[k].score;
    if (s != null) {
      weighted += s * w;
      weightSum += w;
    }
  }
  const composite = weightSum > 0 ? weighted / weightSum : null;

  return {
    axes,
    composite: composite != null ? Number(composite.toFixed(2)) : null,
    coverage: Number(weightSum.toFixed(2)), // share of weight backed by an available score
  };
}

// ---------------------------------------------------------------------------
// Comparison across selected deals
// ---------------------------------------------------------------------------

export function compareDeals(deals, assumptions = {}) {
  const results = deals.map((d) => evaluateDeal(d, assumptions));
  const scored = results.filter((r) => r.ok && r.scorecard.composite != null);
  const best = scored.reduce((m, r) => (m == null || r.scorecard.composite > m.scorecard.composite ? r : m), null);

  const verdicts = {};
  for (const r of results) {
    if (!r.ok || r.scorecard.composite == null || !best || scored.length < 2) {
      verdicts[r.id] = scored.length < 2 && r.ok ? "Single deal" : "Unscored";
      continue;
    }
    const gap = best.scorecard.composite - r.scorecard.composite;
    verdicts[r.id] = gap <= 0.001 ? "Stronger" : gap <= 0.3 ? "Comparable" : "Weaker";
  }

  // Cross-deal facts for the memo
  const rank = (key, dir = "desc") =>
    scored
      .filter((r) => r.outputs[key] != null)
      .sort((x, y) => (dir === "desc" ? y.outputs[key] - x.outputs[key] : x.outputs[key] - y.outputs[key]))
      .map((r) => r.id);

  return {
    results,
    verdicts,
    leaders: {
      rateYr1: rank("rateYr1")[0] || null,
      yieldOnCost: rank("yieldOnCost")[0] || null,
      projectNpv: rank("projectNpv")[0] || null,
      fastestDelivery: rank("monthsToFull", "asc")[0] || null,
      bestCredit: scored.slice().sort((x, y) => y.credit.score - x.credit.score)[0]?.id || null,
    },
    assumptions: { ...DEFAULT_ASSUMPTIONS, ...assumptions },
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers (shared by UI, CSV, and memo prompt)
// ---------------------------------------------------------------------------

export function fmtUsd(x, opts = {}) {
  if (x == null || Number.isNaN(x)) return "n/a";
  const abs = Math.abs(x);
  const sign = x < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(opts.b ?? 2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(opts.m ?? 0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtRate(x) {
  if (x == null || Number.isNaN(x)) return "n/a";
  return `$${x.toFixed(0)}`;
}

export function fmtPct(x, d = 1) {
  if (x == null || Number.isNaN(x)) return "n/a";
  return `${(x * 100).toFixed(d)}%`;
}

export function fmtYears(x) {
  if (x == null || Number.isNaN(x)) return "n/a";
  return `${x.toFixed(1)} yrs`;
}
