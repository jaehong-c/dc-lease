"use client";

import { useEffect, useState } from "react";

const SECTIONS = ["Bottom line", "Pricing and economics", "Counterparty and structure", "Delivery and execution", "What would change the view", "Information to confirm"];

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );
}

function MemoBody({ memo }) {
  const lines = memo.split("\n");
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h", text: line.replace(/^##\s*\d*\.?\s*/, "") });
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      flush();
      blocks.push({ type: "li", text: line.replace(/^[-*•]\s+/, "") });
      continue;
    }
    para.push(line);
  }
  flush();

  return (
    <div className="memo-body" style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
      {blocks.map((b, i) => {
        if (b.type === "h") {
          return (
            <div key={i} className="eyebrow" style={{ marginTop: i === 0 ? 0 : 18, marginBottom: 6, color: "var(--ink)" }}>
              {b.text}
            </div>
          );
        }
        if (b.type === "li") {
          return (
            <div key={i} style={{ display: "flex", gap: 8, margin: "0 0 6px" }}>
              <span style={{ color: "var(--ink-3)" }}>·</span>
              <span>{renderInline(b.text)}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(b.text)}</p>;
      })}
    </div>
  );
}

function WritingIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, SECTIONS.length - 1)), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SECTIONS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: state === "todo" ? "var(--ink-4)" : "var(--ink)" }}>
              <span
                className={state === "active" ? "pulse-dot" : ""}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: state === "todo" ? "var(--fill-2)" : "var(--ink)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: state === "active" ? 600 : 400 }}>{s}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 2 }}>
        <div className="skeleton" style={{ height: 12, width: "38%" }} />
        <div className="skeleton" style={{ height: 12 }} />
        <div className="skeleton" style={{ height: 12, width: "94%" }} />
        <div className="skeleton" style={{ height: 12, width: "88%" }} />
        <div className="skeleton" style={{ height: 12, width: "52%" }} />
        <div style={{ height: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "44%" }} />
        <div className="skeleton" style={{ height: 12 }} />
        <div className="skeleton" style={{ height: 12, width: "76%" }} />
        <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Interpreting the engine outputs. Usually 15 to 30 seconds.</p>
      </div>
    </div>
  );
}

export default function MemoPanel({ compare, deals }) {
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const ready = compare && compare.results.filter((r) => r.ok).length >= 1;

  async function generate() {
    if (!ready) return;
    setLoading(true);
    setError("");
    setMemo("");
    try {
      const results = compare.results.filter((r) => r.ok).map(({ cash, ...rest }) => rest);
      const ids = results.map((r) => r.id);
      const payloadDeals = deals.filter((d) => ids.includes(d.id));
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deals: payloadDeals,
          results,
          verdicts: compare.verdicts,
          leaders: compare.leaders,
          assumptions: compare.assumptions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setMemo(data.memo || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="card-title">Investment memo</div>
          <div className="card-sub">AI interprets the numbers above. It does not score them.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {memo && (
            <button className="btn btn-ghost btn-sm" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={!ready || loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ borderTopColor: "var(--surface)", borderColor: "rgba(255,255,255,0.35)" }} />
                Writing
              </>
            ) : memo ? (
              "Regenerate"
            ) : (
              "Generate memo"
            )}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {!memo && !loading && !error && (
          <div style={{ border: "1px dashed var(--border-strong)", borderRadius: 12, padding: "28px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            {ready
              ? "Six sections: bottom line, pricing, counterparty, delivery, what would change the view, information to confirm."
              : "Select at least one deal to generate a memo."}
          </div>
        )}
        {loading && <WritingIndicator />}
        {error && <p style={{ fontSize: 13, color: "var(--tier-3)" }}>{error}</p>}
        {memo && <MemoBody memo={memo} />}
      </div>

      {memo && (
        <p className="muted" style={{ fontSize: 11.5, marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          Generated from the engine outputs and assumptions shown on this page. Figures tagged assumed or derived carry through to the memo.
        </p>
      )}
    </section>
  );
}