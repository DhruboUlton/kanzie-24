"use client";

import { useCallback } from "react";
import {
  CategorySlice,
  Granularity,
  MovementPoint,
  ProductSlice,
  RangePreset,
  StatusSlice,
  TimePoint,
  Totals,
} from "@/lib/analytics-shared";
import { InventorySummary } from "@/lib/inventory-shared";
import AnalyticsControls from "./AnalyticsControls";
import KpiCards from "./KpiCards";
import { OrdersChart, RevenueChart } from "./TimeCharts";
import { CategoryCharts, StatusChart, TopProducts } from "./BreakdownCharts";
import InventorySection from "./InventorySection";
import ProfitSection from "./ProfitSection";
import PerformanceTable from "./PerformanceTable";

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AnalyticsClient({
  preset,
  range,
  compare,
  granularity,
  series,
  previousSeries,
  totals,
  previousTotals,
  statuses,
  topByUnits,
  topByRevenue,
  categories,
  movements,
  costCoverage,
  inventorySummary,
  canSeeMoney,
  canSeeStock,
}: {
  preset: RangePreset;
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  compare: boolean;
  granularity: Granularity;
  series: TimePoint[];
  previousSeries: TimePoint[] | null;
  totals: Totals;
  previousTotals: Totals | null;
  statuses: StatusSlice[];
  topByUnits: ProductSlice[];
  topByRevenue: ProductSlice[];
  categories: CategorySlice[];
  movements: { points: MovementPoint[]; reasons: string[] };
  costCoverage: { withCost: number; total: number };
  inventorySummary: InventorySummary | null;
  canSeeMoney: boolean;
  canSeeStock: boolean;
}) {
  // Exports what's on screen, built from data already loaded rather than a
  // second trip to the server.
  const handleExport = useCallback(() => {
    const header = [
      "Period",
      "Orders",
      ...(canSeeMoney ? ["Revenue (BDT)", "AOV (BDT)"] : []),
      "Units",
      "Delivered",
      "Cancelled",
      ...(canSeeMoney ? ["Estimated gross profit (BDT)"] : []),
    ];
    const rows = series.map((p) =>
      [
        p.label,
        p.orders,
        ...(canSeeMoney
          ? [
              (p.revenueCents / 100).toFixed(2),
              p.orders > 0 ? (p.revenueCents / p.orders / 100).toFixed(2) : "",
            ]
          : []),
        p.units,
        p.delivered,
        p.cancelled,
        ...(canSeeMoney
          ? [p.profitCents === null ? "" : (p.profitCents / 100).toFixed(2)]
          : []),
      ]
        .map(csvCell)
        .join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanzie-analytics-${range.from.slice(0, 10)}-to-${range.to.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [series, range, canSeeMoney]);

  return (
    <div className="space-y-6">
      <AnalyticsControls
        preset={preset}
        range={range}
        compare={compare}
        onExport={handleExport}
      />

      <KpiCards
        totals={totals}
        previous={previousTotals}
        canSeeMoney={canSeeMoney}
      />

      {canSeeMoney && (
        <RevenueChart
          series={series}
          previous={previousSeries}
          compare={compare}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OrdersChart
            series={series}
            previous={previousSeries}
            compare={compare}
          />
        </div>
        <StatusChart statuses={statuses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProducts
          byUnits={topByUnits}
          byRevenue={topByRevenue}
          canSeeMoney={canSeeMoney}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryCharts categories={categories} canSeeMoney={canSeeMoney} />
      </div>

      {canSeeStock && (
        <InventorySection
          summary={inventorySummary}
          movements={movements}
          totals={totals}
          canSeeMoney={canSeeMoney}
        />
      )}

      {canSeeMoney && (
        <ProfitSection
          totals={totals}
          series={series}
          costCoverage={costCoverage}
        />
      )}

      <PerformanceTable
        series={series}
        granularity={granularity}
        canSeeMoney={canSeeMoney}
      />
    </div>
  );
}
