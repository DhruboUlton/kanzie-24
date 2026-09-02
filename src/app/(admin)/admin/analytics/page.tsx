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
      series={series}
      previousSeries={previousSeries}
      totals={totals}
      previousTotals={previousTotals}
      statuses={statuses}
      topByUnits={topProducts.byUnits}
      topByRevenue={topProducts.byRevenue}
      categories={categories}
      movements={movements}
      costCoverage={costCoverage}
      inventorySummary={inventory?.summary ?? null}
      canSeeMoney={canSeeMoney}
      canSeeStock={canSeeStock}
    />
  );
}
