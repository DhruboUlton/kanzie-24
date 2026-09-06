import NoAccess from "@/components/admin/NoAccess";
import AnalyticsClient from "@/components/admin/analytics/AnalyticsClient";
import { requirePageAccess } from "@/lib/admin-guard";
import { getInventory } from "@/lib/inventory";
import {
  getCategoryPerformance,
  getCostCoverage,
  getStatusBreakdown,
  getStockMovementSeries,
  getTimeSeries,
  getTopProducts,
  getTotals,
} from "@/lib/analytics";
import {
  RangePreset,
  granularityFor,
  isRangePreset,
  previousRange,
  resolveRange,
} from "@/lib/analytics-shared";
import {
  redactCategories,
  redactInventorySummary,
  redactProducts,
  redactSeries,
  redactStatuses,
  redactTotals,
} from "@/lib/analytics-redact";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ctx, allowed } = await requirePageAccess("ANALYTICS_VIEW");
  if (!allowed) return <NoAccess what="analytics" />;

  const sp = await props.searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? null;

  const rawRange = one("range");
  const preset: RangePreset = isRangePreset(rawRange) ? rawRange : "last30";
  const range = resolveRange(preset, {
    from: one("from"),
    to: one("to"),
  });
  const compare = one("compare") === "1";
  const previous = previousRange(range);

  // Revenue and profit are money; someone may hold ANALYTICS_VIEW without
  // being allowed to see the store's takings.
  const canSeeMoney = ctx.permissions.includes("FINANCE_VIEW");
  const canSeeStock = ctx.permissions.includes("INVENTORY_VIEW");

  const [
    series,
    totals,
    statuses,
    topProducts,
    categories,
    movements,
    costCoverage,
    previousTotals,
    previousSeries,
    inventory,
  ] = await Promise.all([
    getTimeSeries(range),
    getTotals(range),
    getStatusBreakdown(range),
    getTopProducts(range),
    getCategoryPerformance(range),
    canSeeStock
      ? getStockMovementSeries(range)
      : Promise.resolve({ points: [], reasons: [] }),
    getCostCoverage(),
    compare ? getTotals(previous) : Promise.resolve(null),
    compare ? getTimeSeries(previous) : Promise.resolve(null),
    canSeeStock
      ? getInventory()
      : Promise.resolve(null),
  ]);

  // Everything below crosses into a client component, which means it crosses
  // into the browser. Without FINANCE_VIEW the money never makes that trip —
  // the client's canSeeMoney checks only decide what is drawn, not what was
  // sent.
  const view = canSeeMoney
    ? {
        series,
        previousSeries,
        totals,
        previousTotals,
        statuses,
        topByUnits: topProducts.byUnits,
        topByRevenue: topProducts.byRevenue,
        categories,
        inventorySummary: inventory?.summary ?? null,
      }
    : {
        series: redactSeries(series),
        previousSeries: previousSeries ? redactSeries(previousSeries) : null,
        totals: redactTotals(totals),
        previousTotals: previousTotals ? redactTotals(previousTotals) : null,
        statuses: redactStatuses(statuses),
        topByUnits: redactProducts(topProducts.byUnits),
        // The revenue ranking is itself a revenue figure, and nothing renders
        // it without FINANCE_VIEW.
        topByRevenue: [],
        categories: redactCategories(categories),
        inventorySummary: redactInventorySummary(inventory?.summary ?? null),
      };

  return (
    <AnalyticsClient
      preset={preset}
      range={{ from: range.from.toISOString(), to: range.to.toISOString() }}
      previousRange={{
        from: previous.from.toISOString(),
        to: previous.to.toISOString(),
      }}
      compare={compare}
      granularity={granularityFor(range)}
      series={view.series}
      previousSeries={view.previousSeries}
      totals={view.totals}
      previousTotals={view.previousTotals}
      statuses={view.statuses}
      topByUnits={view.topByUnits}
      topByRevenue={view.topByRevenue}
      categories={view.categories}
      movements={movements}
      costCoverage={costCoverage}
      inventorySummary={view.inventorySummary}
      canSeeMoney={canSeeMoney}
      canSeeStock={canSeeStock}
    />
  );
}
