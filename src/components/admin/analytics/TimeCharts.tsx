"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimePoint } from "@/lib/analytics-shared";
import ChartCard from "./ChartCard";
import { CHART_COLORS, compactTaka, takaExact } from "./format";

type Row = TimePoint & { prevRevenueCents?: number; prevOrders?: number };

// Current and previous periods have different dates, so they are zipped by
// position: point 1 of this period against point 1 of the last one.
function merge(series: TimePoint[], previous: TimePoint[] | null): Row[] {
  return series.map((p, i) => ({
    ...p,
    prevRevenueCents: previous?.[i]?.revenueCents,
    prevOrders: previous?.[i]?.orders,
  }));
}

function Tip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  label?: string;
  money: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-900">{label}</p>
      {money && (
        <p className="text-gray-600 mt-1">
          Revenue: <strong>{takaExact(row.revenueCents)}</strong>
        </p>
      )}
      <p className="text-gray-600">
        Orders: <strong>{row.orders}</strong>
      </p>
      {money && row.prevRevenueCents !== undefined && (
        <p className="text-gray-400 mt-1 pt-1 border-t border-gray-100">
          Previous: {takaExact(row.prevRevenueCents)} · {row.prevOrders} orders
        </p>
      )}
      {!money && row.prevOrders !== undefined && (
        <p className="text-gray-400 mt-1 pt-1 border-t border-gray-100">
          Previous: {row.prevOrders} orders
        </p>
      )}
    </div>
  );
}

const axis = { stroke: CHART_COLORS.axis, fontSize: 11 };

export function RevenueChart({
  series,
  previous,
  compare,
}: {
  series: TimePoint[];
  previous: TimePoint[] | null;
  compare: boolean;
}) {
  const rows = merge(series, previous);
  const isEmpty = rows.every((r) => r.revenueCents === 0);

  return (
    <ChartCard
      title="Revenue Over Time"
      subtitle={
        compare
          ? "Solid is this period, faded is the one before it"
          : "Confirmed orders onward — pending and cancelled excluded"
      }
      height="h-[22rem]"
      isEmpty={isEmpty}
      emptyMessage="No confirmed revenue in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tick={axis}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={(v) => compactTaka(Number(v))}
          />
          <Tooltip content={<Tip money />} />
          {compare && (
            <Area
              type="monotone"
              dataKey="prevRevenueCents"
              stroke={CHART_COLORS.revenuePrev}
              strokeDasharray="4 4"
              fill="none"
              strokeWidth={2}
              dot={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="revenueCents"
            stroke={CHART_COLORS.revenue}
            strokeWidth={2.5}
            fill="url(#revFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function OrdersChart({
  series,
  previous,
  compare,
}: {
  series: TimePoint[];
  previous: TimePoint[] | null;
  compare: boolean;
}) {
  const rows = merge(series, previous);
  const isEmpty = rows.every((r) => r.orders === 0);

  return (
    <ChartCard
      title="Orders Over Time"
      subtitle="Order volume across the period"
      isEmpty={isEmpty}
      emptyMessage="No confirmed orders in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
          <Tooltip content={<Tip money={false} />} />
          {compare && (
            <Line
              type="monotone"
              dataKey="prevOrders"
              stroke={CHART_COLORS.ordersPrev}
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="orders"
            stroke={CHART_COLORS.orders}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
