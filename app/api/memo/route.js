import { NextResponse } from "next/server";

export const maxDuration = 60;

const MODEL = "claude-sonnet-5";

function usd(x) {
  if (x == null) return "n/a";
  const abs = Math.abs(x);
  if (abs >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(x / 1e6).toFixed(0)}M`;
  return `$${Math.round(x)}`;
}
const pct = (x) => (x == null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const rate = (x) => (x == null ? "n/a" : `$${x.toFixed(0)}/kW/mo`);

function describeDeal(d, r, verdict) {
  const o = r.outputs;
  const s = r.scorecard.axes;
  return [
    `### ${d.developerTicker} / ${d.tenant} (${d.campus}, ${d.state}; announced ${d.announcedDate})`,
    `Verdict from the deterministic scorecard: ${verdict} (composite ${r.scorecard.composite ?? "n/a"} of 5).`,
    `Size and term: ${r.inputs.mw} MW critical IT${r.inputs.grossMw ? ` (${r.inputs.grossMw} MW gross)` : ""}, ${r.inputs.termYears}-year base term, renewal options: ${d.renewalOptions || "undisclosed"}.`,
    `Economics: TCV ${usd(o.tcv)} [${r.flags.tcv}], rent yr 1 ${usd(o.rentYr1)} [${r.flags.rent}], rate yr 1 ${rate(o.rateYr1)}, average rate over term ${rate(o.rateAvg)}${o.rateAvgGross != null ? `, average rate on gross MW ${rate(o.rateAvgGross)}` : ""}, escalator ${r.inputs.escalatorPct}% [${r.flags.escalator}], structure ${r.inputs.leaseStructure || "unknown"} [${r.flags.noi === "stated" ? "NNN, NOI equals rent" : `opex ${(r.inputs.opexPct * 100).toFixed(0)}% assumed`}].`,
    `Capital: developer net capex ${usd(r.inputs.developerNetCapex)} [${r.flags.capex}]${r.inputs.tenantFunded ? `, tenant-funded capex ${usd(r.inputs.tenantFunded)} repaid via rent credits` : ""}. Yield on cost ${pct(o.yieldOnCost)} (${o.yocVsBand || "n/a"} the expected band for its credit tier). Project NPV at ${r.inputs.discountRatePct}% ${usd(o.projectNpv)}, unlevered IRR ${pct(o.projectIrr)}, payback ${o.paybackYears != null ? `${o.paybackYears.toFixed(1)} yrs` : "n/a"}. Base term only, no terminal value, no leverage.`,
    `Counterparty: tenant tier ${r.credit.tenantTier}, effective tier ${r.credit.effectiveTier} (${r.credit.label}) [${r.credit.basis}]${r.credit.backstopProvider ? `; backstop by ${r.credit.backstopProvider}${r.credit.coverage != null && r.credit.coverage < 1 ? ` covering about ${pct(r.credit.coverage)} of base-term obligations` : ""}` : ""}.`,
    `Delivery: first rent ${d.deliveryStart || "n/a"}${o.monthsToFirstRent != null && o.monthsToFirstRent <= 0 ? " (already in service)" : ""}, full delivery ${d.fullDelivery || "undisclosed"}.`,
    `Scores (1 to 5): pricing ${s.pricing.score ?? "n/a"}, credit ${s.credit.score ?? "n/a"}, term & structure ${s.termStructure.score ?? "n/a"}, capex efficiency ${s.capexEfficiency.score ?? "n/a"}, delivery ${s.delivery.score ?? "n/a"}.`,
    `Data gaps: ${(r.gaps || []).map((g) => `${g.field} is ${g.basis}`).join("; ") || "none"}.`,
    `Analyst notes from the library: ${(d.notes || []).join(" ")}`,
  ].join("\n");
}

function buildPrompt({ deals, results, verdicts, leaders, assumptions }) {
  const blocks = results
    .filter((r) => r.ok)
    .map((r) => describeDeal(deals.find((d) => d.id === r.id), r, verdicts[r.id]))
    .join("\n\n");

  const name = (id) => {
    const d = deals.find((x) => x.id === id);
    return d ? `${d.developerTicker} / ${d.tenant}` : "n/a";
  };

  return `You are writing an internal investment memo for the data center development team at a public infrastructure developer. The reader is a senior leader deciding which lease structures to pursue. Write from the developer / landlord perspective.

Below are ${results.length} publicly disclosed data center leases that have already been scored by a deterministic rules engine. Your job is to INTERPRET the numbers, not to recompute or re-score them. Use only the figures provided. Do not invent numbers, dates, or counterparties. Where a figure is tagged [assumed], [derived], [estimated], or [unverified], say so when it matters to the conclusion.

Global assumptions in force: discount rate ${assumptions.discountRatePct}% (target unlevered return), assumed capex $${(assumptions.capexPerCriticalMwUsd / 1e6).toFixed(1)}M per critical IT MW where undisclosed, default escalator ${assumptions.escalatorDefaultPct}% where undisclosed, opex ${assumptions.opexPctOfRevenue}% of revenue for non-NNN structures. NPV and IRR cover the base term only with no terminal value and no leverage.

Engine leaders: highest rate ${name(leaders.rateYr1)}; best credit ${name(leaders.bestCredit)}; highest yield on cost ${name(leaders.yieldOnCost)}; fastest to full delivery ${name(leaders.fastestDelivery)}.

${blocks}

Write the memo in exactly these six sections, each starting with a line that begins with "## " followed by the section title:
1. Bottom line: which deal is the stronger structure for a developer and why, in three to four sentences. Use the vocabulary Stronger, Comparable, Weaker as the engine does.
2. Pricing and economics: rate, escalator, TCV, yield on cost, NPV and IRR. Point out where the headline TCV or average rate is misleading (for example phased delivery or gross versus critical IT denominators).
3. Counterparty and structure: effective credit including any backstop, NNN versus hosting, tenant-funded capex, renewal options, take-or-pay, and whether the yield on cost is paying for the credit risk.
4. Delivery and execution: timing to first rent and full delivery, conversion versus greenfield, and how delivery risk interacts with the economics.
5. What would change the view: the two or three assumptions or undisclosed inputs that most affect the ranking, with direction (which deal benefits if the assumption moves).
6. Information to confirm: a short list drawn from the data gaps, phrased as diligence asks.

Style: about 450 to 550 words. Plain prose, short paragraphs, no bullet lists except in section 6. Bold the two or three most decision-relevant phrases using **double asterisks**. No preamble, no sign-off, no headers other than the six "## " lines.`;
}

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deals, results, verdicts, leaders, assumptions } = body || {};
  if (!deals || !results || results.length === 0) {
    return NextResponse.json({ error: "No comparison payload" }, { status: 400 });
  }

  const prompt = buildPrompt({ deals, results, verdicts: verdicts || {}, leaders: leaders || {}, assumptions: assumptions || {} });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API ${res.status}: ${text.slice(0, 300)}` }, { status: 502 });
    }

    const data = await res.json();
    const memo = (data.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();

    return NextResponse.json({ memo, model: MODEL, usage: data.usage || null });
  } catch (err) {
    return NextResponse.json({ error: `Memo generation failed: ${err.message}` }, { status: 500 });
  }
}