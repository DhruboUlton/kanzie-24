"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  CategorySlice,
  ProductSlice,
  StatusSlice,
} from "@/lib/analytics-shared";
import { ORDER_STATUS_COLORS, OrderStatus } from "@/lib/order-status";
import ChartCard from "./ChartCard";
import { CATEGORY_COLORS, CHART_COLORS, compactTaka, takaExact } from "./format";

const axis = { stroke: CHART_COLORS.axis, fontSize: 11 };

export function StatusChart({ statuses }: { statuses: StatusSlice[] }) {
  const total = statuses.reduce((s, x) => s + x.count, 0);

  return (
    <ChartCard
      title="Order Status"
      subtitle={`${total} order${total === 1 ? "" : "s"} placed in this period`}
      isEmpty={total === 0}
      emptyMessage="No orders placed in this period."
    >
      <div className="h-full flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-1/2 h-40 sm:h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statuses}
                dataKey="count"
                nameKey="status"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                stroke="none"
              >
                {statuses.map((s) => (
                  <Cell
                    key={s.status}
                    fill={ORDER_STATUS_COLORS[s.status as OrderStatus] ?? "#9ca3af"}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const s = payload[0].payload as StatusSlice;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                      <p className="font-bold text-gray-900">{s.status}</p>
                      <p className="text-gray-600 mt-0.5">
                        {s.count} order{s.count === 1 ? "" : "s"} ·{" "}
                        {((s.count / total) * 100).toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* The legend carries the exact counts, so the donut doesn't have to. */}
        <ul className="w-full sm:w-1/2 space-y-1.5 overflow-y-auto">
          {statuses.map((s) => (
            <li key={s.status} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{
                  backgroundColor:
                    ORDER_STATUS_COLORS[s.status as OrderStatus] ?? "#9ca3af",
                }}
              />
              <span className="font-semibold text-gray-700 flex-1 truncate">
                {s.status}
              </span>
              <span className="tabular-nums text-gray-900 font-bold">{s.count}</span>
              <span className="tabular-nums text-gray-400 w-12 text-right">
                {((s.count / total) * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

function HorizontalBars({
  title,
  subtitle,
  data,
  dataKey,
  color,
  money,
}: {
  title: string;
  subtitle: string;
  data: ProductSlice[];
  dataKey: "units" | "revenueCents";
  color: string;
  money: boolean;
}) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height="h-80"
      isEmpty={data.length === 0}
      emptyMessage="Nothing sold in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (money ? compactTaka(Number(v)) : String(v))}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...axis, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={110}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "#f9fafb" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as ProductSlice;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-[11px] font-mono text-gray-400">{p.sku}</p>
                  <p className="text-gray-600 mt-1">
                    {p.units} unit{p.units === 1 ? "" : "s"} ·{" "}
                    {takaExact(p.revenueCents)}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopProducts({
  byUnits,
  byRevenue,
  canSeeMoney,
}: {
  byUnits: ProductSlice[];
  byRevenue: ProductSlice[];
  canSeeMoney: boolean;
}) {
  return (
    <>
      <HorizontalBars
        title="Top Products by Units Sold"
        subtitle="How many left the shelf"
        data={byUnits}
        dataKey="units"
        color={CHART_COLORS.units}
        money={false}
      />
      {canSeeMoney && (
        <HorizontalBars
          title="Top Products by Revenue"
          subtitle="What they actually brought in"
          data={byRevenue}
          dataKey="revenueCents"
          color={CHART_COLORS.revenue}
          money
        />
      )}
    </>
  );
}

export function CategoryCharts({
  categories,
  canSeeMoney,
}: {
  categories: CategorySlice[];
  canSeeMoney: boolean;
}) {
  const isEmpty = categories.length === 0;

  return (
    <>
      {canSeeMoney && (
        <ChartCard
          title="Revenue by Category"
          subtitle="Where the money came from"
          isEmpty={isEmpty}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ ...axis, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={axis}
                tickLine={false}
                axisLine={false}
                width={58}
                tickFormatter={(v) => compactTaka(Number(v))}
              />
              <Tooltip
                cursor={{ fill: "#f9fafb" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const c = payload[0].payload as CategorySlice;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                      <p className="font-bold text-gray-900">{c.name}</p>
                      <p className="text-gray-600 mt-0.5">
                        {takaExact(c.revenueCents)} · {c.units} units
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenueCents" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {categories.map((c, i) => (
                  <Cell key={c.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard
        title="Units Sold by Category"
        subtitle="Volume, independent of price"
        isEmpty={isEmpty}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categories} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ ...axis, fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "#f9fafb" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const c = payload[0].payload as CategorySlice;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                    <p className="font-bold text-gray-900">{c.name}</p>
                    <p className="text-gray-600 mt-0.5">{c.units} units</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="units" fill={CHART_COLORS.units} radius={[4, 4, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
