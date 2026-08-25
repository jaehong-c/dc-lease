"use client";

import { useMemo, useState } from "react";
import { compareDeals, DEFAULT_ASSUMPTIONS } from "../lib/economics";
import { buildCsv, downloadCsv } from "../lib/exportCsv";
import DealCard, { NEW_CUSTOM } from "./DealCard";
import CustomDealForm from "./CustomDealForm";
import SideBySide from "./SideBySide";
import Assumptions from "./Assumptions";
import DataGaps from "./DataGaps";
import MemoPanel from "./MemoPanel";

function blankCustom(id) {
  return {
    id,
    custom: true,
    developer: "",
    developerTicker: "",
    tenant: "",
    tenantShort: "",
    campus: "",
    state: "",
    announcedDate: "",
    sources: [],
    notes: ["Custom deal entered by the user. Figures carry the basis chosen on entry."],
    criticalItMw: null,
    criticalItMwBasis: "unknown",
    grossMw: null,
    termYears: null,
    termYearsBasis: "unknown",
    tcv: null,
    tcvBasis: "unknown",
    annualRentYr1: null,
    annualRentYr1Basis: "unknown",
    escalatorPct: null,
    escalatorBasis: "unknown",
    leaseStructure: "NNN",
    leaseStructureBasis: "stated",
    takeOrPay: null,
    renewalOptionsCount: null,
    renewalOptions: null,
    deliveryStart: "2027-Q1",
    deliveryStartBasis: "assumed",
    fullDelivery: null,
    fullDeliveryBasis: "stated",
    developerCapexTotal: null,
    developerCapexTotalBasis: "unknown",
    tenantFundedCapex: null,
    tenantFundedCapexBasis: "unknown",
    tenantCreditTier: 2,
    backstop: null,
    effectiveCreditTier: null,
    effectiveCreditBasis: null,
  };
}

function cloneAsCustom(deal, id) {
  const copy = JSON.parse(JSON.stringify(deal));
  return {
    ...copy,
    id,
    custom: true,
    tenantShort: copy.tenantShort || copy.tenant,
    developerTicker: `${copy.developerTicker}*`,
    notes: [`Custom copy of ${copy.developerTicker} / ${copy.tenant}. Edited figures carry the basis chosen on entry.`, ...(copy.notes || [])],
    effectiveCreditTier: copy.effectiveCreditTier ?? null,
  };
}

export default function Comparator({ library }) {
  const deals = library.deals;
  const presets = library.presets;

  const [slots, setSlots] = useState(presets[0].dealIds.concat([null]).slice(0, 3));
  const [activePreset, setActivePreset] = useState(presets[0].id);
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [customs, setCustoms] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [editing, setEditing] = useState(null); // custom deal id being edited

  const allDeals = [...deals, ...customs];
  const selected = slots.map((id) => (id ? allDeals.find((d) => d.id === id) || null : null));
  const activeDeals = selected.filter(Boolean);

  const compare = useMemo(() => {
    if (activeDeals.length === 0) return null;
    return compareDeals(activeDeals, assumptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.join("|"), assumptions, customs]);

  function applyPreset(p) {
    setActivePreset(p.id);
    setEditing(null);
    setSlots([p.dealIds[0] || null, p.dealIds[1] || null, p.dealIds[2] || null]);
  }

  function placeInSlot(i, id) {
    setActivePreset(null);
    setSlots((prev) => {
      const next = [...prev];
      next[i] = id || null;
      return next;
    });
  }

  function newCustom(i, fromDeal) {
    const id = `custom-${nextId}`;
    setNextId((n) => n + 1);
    const d = fromDeal ? cloneAsCustom(fromDeal, id) : blankCustom(id);
    setCustoms((prev) => [...prev, d]);
    placeInSlot(i, id);
    setEditing(id);
  }

  function setSlot(i, value) {
    if (value === NEW_CUSTOM) return newCustom(i, null);
    setEditing(null);
    placeInSlot(i, value);
  }

  function updateCustom(updated) {
    setCustoms((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function removeCustom(id) {
    setCustoms((prev) => prev.filter((d) => d.id !== id));
    setSlots((prev) => prev.map((s) => (s === id ? null : s)));
    setEditing(null);
  }

  function resultFor(id) {
    return compare ? compare.results.find((r) => r.id === id) : null;
  }

  function exportCsv() {
    if (!compare) return;
    const csv = buildCsv({ compare, deals: allDeals });
    const tag = compare.results.map((r) => allDeals.find((d) => d.id === r.id)?.developerTicker).filter(Boolean).join("-").toLowerCase().replace(/\*/g, "");
    downloadCsv(csv, `dc-lease-${tag || "comparison"}.csv`);
  }

  const results = compare ? compare.results : [];
  const verdicts = compare ? compare.verdicts : {};
  const editingDeal = editing ? customs.find((d) => d.id === editing) : null;

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
            setEditing(null);
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
            customs={customs}
            onChange={(id) => setSlot(i, id)}
            onClear={() => {
              setEditing(null);
              placeInSlot(i, null);
            }}
            onCustomize={() => newCustom(i, deal)}
            onEdit={() => setEditing(deal.id)}
          />
        ))}
      </div>

      {/* Custom deal editor */}
      {editingDeal && (
        <CustomDealForm
          deal={editingDeal}
          onChange={updateCustom}
          onDone={() => setEditing(null)}
          onRemove={() => removeCustom(editingDeal.id)}
        />
      )}

      {/* Comparison + assumptions */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        <SideBySide results={results} deals={allDeals} verdicts={verdicts} leaders={compare?.leaders} />
        <Assumptions value={assumptions} onChange={setAssumptions} />
      </div>

      {/* Data gaps + memo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, alignItems: "start" }}>
        <DataGaps results={results} deals={allDeals} />
        <MemoPanel compare={compare} deals={allDeals} />
      </div>
    </div>
  );
}