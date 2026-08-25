"use client";

import { useMemo, useState } from "react";
import { compareDeals, DEFAULT_ASSUMPTIONS } from "../lib/economics";
import { buildCsv, downloadCsv } from "../lib/exportCsv";
import DealCard from "./DealCard";
import SideBySide from "./SideBySide";
import Assumptions from "./Assumptions";
import DataGaps from "./DataGaps";
import MemoPanel from "./MemoPanel";

export default function Comparator({ library }) {
  const deals = library.deals;
  const presets = library.presets;

  const [slots, setSlots] = useState(presets[0].dealIds.concat([null]).slice(0, 3));
  const [activePreset, setActivePreset] = useState(presets[0].id);
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);

  const selected = slots.map((id) => (id ? deals.find((d) => d.id === id) || null : null));
  const activeDeals = selected.filter(Boolean);

  const compare = useMemo(() => {
    if (activeDeals.length === 0) return null;
    return compareDeals(activeDeals, assumptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.join("|"), assumptions]);

  function applyPreset(p) {
    setActivePreset(p.id);
    setSlots([p.dealIds[0] || null, p.dealIds[1] || null, p.dealIds[2] || null]);
  }

  function setSlot(i, id) {
    setActivePreset(null);
    setSlots((prev) => {
      const next = [...prev];
      next[i] = id || null;
      return next;
    });
  }

  function resultFor(id) {
    return compare ? compare.results.find((r) => r.id === id) : null;
  }

  function exportCsv() {
    if (!compare) return;
    const csv = buildCsv({ compare, deals });
    const tag = compare.results.map((r) => deals.find((d) => d.id === r.id)?.developerTicker).filter(Boolean).join("-").toLowerCase();
    downloadCsv(csv, `dc-lease-${tag || "comparison"}.csv`);
  }

  const results = compare ? compare.results : [];
  const verdicts = compare ? compare.verdicts : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toolbar */}
      <section className="card card-tight" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <span className="eyebrow" style={{ marginRight: 4 }}>Presets</span>
        {presets.map((p) => (
          <button
            key={p.id}
            className={`btn btn-sm ${activePreset === p.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => applyPreset(p)}
            title={p.description}
          >
            {p.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!compare}>
          Export CSV
        </button>
        <button
          className="btn btn-soft btn-sm"
          onClick={() => {
            setActivePreset(null);
            setSlots([null, null, null]);
          }}
        >
          Start blank
        </button>
      </section>

      {activePreset && (
        <p className="muted" style={{ fontSize: 13, marginTop: -8, paddingLeft: 4 }}>
          {presets.find((p) => p.id === activePreset)?.description}
        </p>
      )}

      {/* Deal slots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20 }}>
        {selected.map((deal, i) => (
          <DealCard
            key={i}
            index={i}
            deal={deal}
            result={deal ? resultFor(deal.id) : null}
            verdict={deal && compare ? verdicts[deal.id] : null}
            library={deals}
            onChange={(id) => setSlot(i, id)}
            onClear={() => setSlot(i, null)}
          />
        ))}
      </div>

      {/* Comparison + assumptions */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        <SideBySide results={results} deals={deals} verdicts={verdicts} leaders={compare?.leaders} />
        <Assumptions value={assumptions} onChange={setAssumptions} />
      </div>

      {/* Data gaps + memo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, alignItems: "start" }}>
        <DataGaps results={results} deals={deals} />
        <MemoPanel compare={compare} deals={deals} />
      </div>
    </div>
  );
}