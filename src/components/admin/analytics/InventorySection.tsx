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
import { Boxes, Coins, PackageX, TriangleAlert } from "lucide-react";
import { MovementPoint, Totals } from "@/lib/analytics-shared";
import { InventorySummary, REASON_SHORT, StockReason } from "@/lib/inventory-shared";
import ChartCard from "./ChartCard";
import { CHART_COLORS, taka } from "./format";

// A restock and a sale move stock in opposite directions, so each reason
// keeps its own series rather than being flattened into one "movement" line.
const REASON_COLORS: Record<StockReason, string> = {
  RESTOCK: "#10b981",
  SALE: "#c0282b",
  RETURN: "#3b82f6",
  DAMAGE: "#f59e0b",
  LOST: "#8b5cf6",
  CORRECTION: "#9ca3af",
};

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function InventorySection({
  summary,
  movements,
  totals,
  canSeeMoney,
}: {
  summary: InventorySummary | null;
  movements: { points: MovementPoint[]; reasons: string[] };
  totals: Totals;
  canSeeMoney: boolean;
}) {
  if (!summary) return null;

  const hasMovements = movements.reasons.length > 0;

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
        Inventory
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat
          icon={Boxes}
          label="Total stock"
          value={String(summary.unitCount)}
          hint={`across ${summary.skuCount} products`}
        />
        <Stat
          icon={TriangleAlert}
          label="Low stock"
          value={String(summary.lowCount)}
          hint="at or below their alert level"
        />
        <Stat icon={PackageX} label="Out of stock" value={String(summary.outCount)} />
        {canSeeMoney && (
          <Stat
            icon={Coins}
            label="Inventory value"
            value={
              summary.costKnownCount === 0
                ? taka(summary.retailValueCents)
                : taka(summary.costValueCents)
            }
            hint={
              summary.costKnownCount === 0
                ? "at retail — no cost prices set"
                : `at cost, for ${summary.costKnownCount} of ${summary.skuCount}`
            }
          />
        )}
        <Stat
          icon={Boxes}
          label="Units sold"
          value={String(totals.units)}
          hint="in the selected period"
        />
      </div>

      <ChartCard
        title="Stock Movement Over Time"
        subtitle="Each reason kept separate — a restock is not a sale"
        isEmpty={!hasMovements}
        emptyMessage="No stock movements recorded in this period."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={movements.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ stroke: CHART_COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ stroke: CHART_COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "#f9fafb" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                    <p className="font-bold text-gray-900">{label}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="text-gray-600 mt-0.5">
                        {REASON_SHORT[p.dataKey as StockReason] ?? p.dataKey}:{" "}
                        <strong>{p.value} units</strong>
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              formatter={(v) => (
                <span className="text-xs text-gray-600">
                  {REASON_SHORT[v as StockReason] ?? v}
                </span>
              )}
            />
            {movements.reasons.map((reason) => (
              <Bar
                key={reason}
                dataKey={reason}
                stackId="movement"
                fill={REASON_COLORS[reason as StockReason] ?? "#9ca3af"}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}
