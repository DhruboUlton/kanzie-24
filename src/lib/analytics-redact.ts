import {
  CategorySlice,
  ProductSlice,
  StatusSlice,
  TimePoint,
  Totals,
} from "@/lib/analytics-shared";
import { InventorySummary } from "@/lib/inventory-shared";

// FINANCE_VIEW is "See revenue and stock valuation figures". Hiding the
// revenue cards in the browser does not honour that: every prop a server
// component hands a client component is serialised into the RSC payload, so
// an ANALYTICS_VIEW-only staffer could read the exact figures out of the
// response body in devtools. These strip the money before it is handed over,
// so what the page ships matches what the permission allows.
//
// Order counts, unit counts and status splits are ANALYTICS_VIEW's own remit
// and stay intact — only the currency amounts are blanked.

export function redactSeries(series: TimePoint[]): TimePoint[] {
  return series.map((p) => ({ ...p, revenueCents: 0, profitCents: null }));
}

export function redactTotals(totals: Totals): Totals {
  return {
    ...totals,
    revenueCents: 0,
    aovCents: 0,
    profitCents: null,
    profitCoverageRevenueCents: 0,
  };
}

export function redactStatuses(statuses: StatusSlice[]): StatusSlice[] {
  return statuses.map((s) => ({ ...s, revenueCents: 0 }));
}

export function redactProducts(products: ProductSlice[]): ProductSlice[] {
  return products.map((p) => ({ ...p, revenueCents: 0 }));
}

export function redactCategories(categories: CategorySlice[]): CategorySlice[] {
  return categories.map((c) => ({ ...c, revenueCents: 0 }));
}

export function redactInventorySummary(
  summary: InventorySummary | null,
): InventorySummary | null {
  if (!summary) return null;
  return { ...summary, retailValueCents: 0, costValueCents: 0 };
}
