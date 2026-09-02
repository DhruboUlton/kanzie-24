"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle } from "lucide-react";
import { TimePoint, Totals } from "@/lib/analytics-shared";
import ChartCard from "./ChartCard";
import { CHART_COLORS, compactTaka, taka, takaExact } from "./format";

export default function ProfitSection({
  totals,
  series,
  costCoverage,
}: {
  totals: Totals;
  series: TimePoint[];
  costCoverage: { withCost: number; total: number };
}) {
  const margin =
    totals.profitCents !== null && totals.profitCoverageRevenueCents > 0
      ? (totals.profitCents / totals.profitCoverageRevenueCents) * 100
      : null;

  const coveragePct =
    totals.revenueCents > 0
      ? (totals.profitCoverageRevenueCents / totals.revenueCents) * 100
      : 0;

  const rows = series.filter((p) => p.profitCents !== null);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
        Profit
      </h3>

      {/* The caveat comes first. A margin figure that silently rests on
          today's cost prices is worse than no figure at all. */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-900 leading-relaxed space-y-1">
          <p>
            <strong>These figures are an estimate, not historical margin.</strong>{" "}
            An order line records the price it sold at but not what the unit
            cost at the time, so profit here is revenue minus what those units
            would cost to buy <em>today</em>. Change a cost price and every past
            period&apos;s profit moves with it.
          </p>
          <p>
            Only lines whose product has a cost price are counted:{" "}
            <strong>
              {costCoverage.withCost} of {costCoverage.total} products
            </strong>{" "}
            have one, covering{" "}
            <strong>{coveragePct.toFixed(0)}%</strong> of this period&apos;s
            revenue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Gross profit (estimated)
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {totals.profitCents === null ? "—" : taka(totals.profitCents)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            on {takaExact(totals.profitCoverageRevenueCents)} of costed revenue
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Gross margin (estimated)
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {margin === null ? "—" : `${margin.toFixed(1)}%`}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            of the revenue it could be calculated on
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Revenue
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {taka(totals.revenueCents)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">all confirmed orders</p>
        </div>
      </div>

      <ChartCard
        title="Revenue vs Gross Profit"
        subtitle="Only periods with costed sales appear"
        isEmpty={rows.length === 0}
        emptyMessage="No sold item in this period has a cost price on file."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ stroke: CHART_COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              tick={{ stroke: CHART_COLORS.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={58}
              tickFormatter={(v) => compactTaka(Number(v))}
            />
            <Tooltip
              cursor={{ fill: "#f9fafb" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as TimePoint;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                    <p className="font-bold text-gray-900">{label}</p>
                    <p className="text-gray-600 mt-1">
                      Revenue: <strong>{takaExact(p.revenueCents)}</strong>
                    </p>
                    <p className="text-emerald-600">
                      Est. profit: <strong>{takaExact(p.profitCents ?? 0)}</strong>
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              formatter={(v) => (
                <span className="text-xs text-gray-600">
                  {v === "revenueCents" ? "Revenue" : "Estimated gross profit"}
                </span>
              )}
            />
            <Bar dataKey="revenueCents" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="profitCents" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}
