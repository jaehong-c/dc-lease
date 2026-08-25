import { NextResponse } from "next/server";
import library from "../../../data/deals.json";
import { compareDeals } from "../../../lib/economics";

export async function GET() {
  return NextResponse.json({
    meta: library.meta,
    presets: library.presets,
    deals: library.deals.map((d) => ({
      id: d.id,
      developer: d.developer,
      developerTicker: d.developerTicker,
      tenant: d.tenant,
      campus: d.campus,
      state: d.state,
      criticalItMw: d.criticalItMw,
      termYears: d.termYears,
      announcedDate: d.announcedDate,
    })),
  });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { dealIds = [], customDeals = [], assumptions = {} } = body || {};

  const fromLibrary = dealIds
    .map((id) => library.deals.find((d) => d.id === id))
    .filter(Boolean);
  const selected = [...fromLibrary, ...customDeals];

  if (selected.length === 0) {
    return NextResponse.json({ error: "No deals selected" }, { status: 400 });
  }
  if (selected.length > 3) {
    return NextResponse.json({ error: "Maximum 3 deals" }, { status: 400 });
  }

  const result = compareDeals(selected, assumptions);
  // Strip monthly cash flow arrays from the API payload; the UI computes those locally.
  const results = result.results.map((r) => {
    if (!r.ok) return r;
    const { cash, ...rest } = r;
    return rest;
  });

  return NextResponse.json({ ...result, results });
}