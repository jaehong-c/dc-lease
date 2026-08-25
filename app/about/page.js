import Link from "next/link";
import library from "../../data/deals.json";
import { WEIGHTS, YOC_BAND_BY_TIER, DEFAULT_ASSUMPTIONS } from "../../lib/economics";

export const metadata = {
  title: "About · DC Lease Comparator",
};

const REPO_URL = "https://github.com/jaehong-c/dc-lease";

function Section({ title, children }) {
  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="card-title">{title}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function Formula({ children }) {
  return (
    <div className="mono" style={{ background: "var(--fill)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "var(--ink)" }}>
      {children}
    </div>
  );
}

export default function About() {
  const deals = library.deals;
  const a = DEFAULT_ASSUMPTIONS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
      <div>
        <div className="eyebrow">About</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 6 }}>DC Lease Comparator</h1>
        <p style={{ fontSize: 14.5, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.6 }}>
          Built by Jae Chung. Code and data are public on{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            GitHub
          </a>
          .
        </p>
        <p style={{ fontSize: 14.5, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.6 }}>
          A side-by-side underwriting tool for publicly disclosed data center leases. Pick two or three deals, or enter
          your own, adjust the assumptions, and read the economics from the developer's side of the table: rate per kW,
          yield on cost, NPV, effective counterparty credit, and delivery timing. A rules engine does the scoring. An AI
          memo interprets the result and says which inputs are stated, derived, or assumed.
        </p>
      </div>

      <Section title="Why this exists">
        <p>
          Public data center lease announcements are written for equity investors. They lead with total contract value and
          megawatts, and leave out the things a developer actually underwrites: the denominator (critical IT versus gross),
          when rent starts, who funds the build, and who really stands behind the tenant. This tool normalizes those
          announcements onto one set of definitions so they can be compared honestly.
        </p>
        <p>
          It is the third of three tools that follow a data center asset through its life:{" "}
          <a href="https://dc-screener.vercel.app" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            DC Site Screener
          </a>{" "}
          (site selection),{" "}
          <span style={{ fontWeight: 500, color: "var(--ink)" }}>DC Lease Comparator</span> (lease economics), and{" "}
          <a href="https://dc-risk.vercel.app" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            DC Risk Register
          </a>{" "}
          (lifecycle risk).
        </p>
      </Section>

      <Section title="Definitions">
        <p>
          <strong>Critical IT MW</strong> is the billable denominator. Gross MW is shown for context only. Where a release
          quotes gross capacity (for example the CIFR / AWS lease), the critical IT figure comes from secondary reporting and
          is flagged unverified.
        </p>
        <Formula>rate ($/kW/month) = annual rent ÷ (critical IT MW × 1,000) ÷ 12</Formula>
        <p>
          <strong>Average rate</strong> is base-term contract value divided by term, per kW per month. It is the figure
          announcements usually imply. <strong>Year-1 rate</strong> is derived from the same TCV and the escalator, so that
          escalated rent over the term sums to the disclosed TCV. Both are shown at equal weight because the first is what
          gets quoted and the second is what the first year's cash flow actually looks like. If only average annual revenue
          is disclosed (GLXY), TCV is first derived as average revenue times term and flagged.
        </p>
        <Formula>rent yr 1 = TCV ÷ [((1 + e)^T − 1) ÷ e]</Formula>
        <p>
          <strong>NOI</strong> equals rent for NNN leases, which is the standard structure in this market: the tenant pays
          operating cost and power is passed through at cost. For hosting, gross, or undisclosed structures an opex share
          is deducted and flagged assumed.
        </p>
        <p>
          <strong>Yield on cost</strong> is year-1 NOI over developer net capex. Net capex excludes any tenant-funded
          build cost. Total developer capex is almost never disclosed, so the engine applies an assumed cost per critical
          IT MW and flags every dependent output.
        </p>
        <Formula>yield on cost = NOI yr 1 ÷ (developer capex − tenant-funded capex)</Formula>
        <p>
          <strong>NPV and IRR</strong> are unlevered and cover the base term only, with no terminal value. Cash flows are
          monthly. The lease clock starts at first delivery; rent ramps linearly to full delivery; capex is spread evenly
          over a construction window ending at first delivery. Tenant-funded capex is repaid through rent credits capped at
          a share of monthly rent.
        </p>
      </Section>

      <Section title="Effective credit">
        <p>
          The nominal tenant and the credit that actually backs the lease are often different. A private AI cloud with a
          hyperscaler backstop is not a Tier 3 counterparty for the covered share of the obligation. The engine records
          the tenant tier, any disclosed backstop and its amount, and blends the credit score by coverage.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", fontSize: 13 }}>
          <span className="chip chip-tier-1">Tier 1</span>
          <span>Investment-grade hyperscaler, IG parent guarantee, or IG credit support covering the lease</span>
          <span className="chip chip-tier-2">Tier 2</span>
          <span>Well-funded private AI lab or AI cloud without disclosed IG support</span>
          <span className="chip chip-tier-3">Tier 3</span>
          <span>Speculative or thinly capitalized counterparty</span>
        </div>
        <p>
          Each tier carries an illustrative expected yield-on-cost band ({Object.entries(YOC_BAND_BY_TIER).map(([t, b]) => `Tier ${t}: ${(b.low * 100).toFixed(1)} to ${(b.high * 100).toFixed(1)}%`).join("; ")}). The band is a heuristic, not a
          market survey. It exists to ask one question: is the yield paying for the credit risk?
        </p>
      </Section>

      <Section title="Scorecard">
        <p>Five axes, each scored 1 to 5 from the developer's perspective, weighted into a composite:</p>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", fontSize: 13 }}>
          <span className="mono">{Math.round(WEIGHTS.pricing * 100)}%</span><span>Pricing: year-1 rate per kW</span>
          <span className="mono">{Math.round(WEIGHTS.credit * 100)}%</span><span>Credit: effective tier, blended by backstop coverage</span>
          <span className="mono">{Math.round(WEIGHTS.termStructure * 100)}%</span><span>Term and structure: term length, stated escalator, take-or-pay, renewal options</span>
          <span className="mono">{Math.round(WEIGHTS.capexEfficiency * 100)}%</span><span>Capex efficiency: yield on developer net cost</span>
          <span className="mono">{Math.round(WEIGHTS.delivery * 100)}%</span><span>Delivery: months to full delivery, capped at 3 where full delivery is undisclosed</span>
        </div>
        <p>
          Verdicts are relative to the deals on screen: the top composite is <strong>Stronger</strong>, anything within 0.3
          is <strong>Comparable</strong>, the rest <strong>Weaker</strong>. A single deal is not scored against itself.
        </p>
      </Section>

      <Section title="Custom deals">
        <p>
          Any slot can hold a deal you enter yourself, or a copy of a library deal with the numbers changed. Every input
          carries a basis of stated, assumed, or unknown. Unknown inputs fall back to the global assumptions and are listed
          under Data gaps, so a custom deal is scored on exactly the same footing as a disclosed one. Copying a library deal
          and changing one input (for example the escalator) is the quickest way to run a sensitivity.
        </p>
      </Section>

      <Section title="Assumptions and what the AI does">
        <p>
          Defaults: discount rate {a.discountRatePct}% (a target unlevered return, not WACC), assumed capex $
          {(a.capexPerCriticalMwUsd / 1e6).toFixed(1)}M per critical IT MW, default escalator {a.escalatorDefaultPct}%, opex{" "}
          {a.opexPctOfRevenue}% of revenue for non-NNN structures, construction window {a.constructionMonthsBeforeDelivery}{" "}
          months, rent credit cap {a.rentCreditCapPct}%. Every assumption is adjustable and every output that depends on
          one carries a flag.
        </p>
        <p>
          The memo is generated by Claude from the engine outputs and the assumptions shown on screen. It does not
          calculate or score anything. It is asked to interpret, to say where headline figures mislead, and to list what
          to confirm in diligence.
        </p>
      </Section>

      <Section title="Limitations">
        <p>
          The comp universe is limited to leases disclosed by public companies. That skews toward developers that
          converted from bitcoin mining, because hyperscaler-direct leases with private developers are rarely announced.
          Read the set as a view of one segment of the market, not the whole of it.
        </p>
        <p>
          Capex is undisclosed in every deal in the library. Yield on cost, NPV, IRR, and payback all rest on the capex
          assumption. The tool is most useful for comparing deals under one consistent assumption, not for estimating any
          developer's actual return.
        </p>
        <p>
          NPV excludes terminal value and renewal options, which understates long-dated leases. Ramp and construction
          timing are modeled as linear, which is a simplification of phased delivery.
        </p>
      </Section>

      <Section title="Deal library and sources">
        <p>Last verified {library.meta.lastVerified}. Each deal links to the primary disclosure used.</p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {deals.map((d) => (
            <div key={d.id} className="line-item" style={{ alignItems: "flex-start" }}>
              <span className="label" style={{ color: "var(--ink)" }}>
                {d.developerTicker} / {d.tenantShort || d.tenant}
                <span className="muted"> · {d.campus}, {d.state} · {d.announcedDate}</span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                {d.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, textDecoration: "underline", color: "var(--ink-2)" }}>
                    {s.label}
                  </a>
                ))}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Stack and version">
        <p>
          Next.js (App Router, JavaScript), static JSON data layer, deterministic engine in <span className="mono">lib/economics.js</span>,
          Anthropic API called from a server route for the memo, deployed on Vercel. v0.2.0. Planned: sensitivity table,
          saved comparisons, PDF export.
        </p>
        <p>
          <Link href="/" className="btn btn-primary btn-sm">Back to comparator</Link>
        </p>
      </Section>
    </div>
  );
}