"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Totals, percentChange } from "@/lib/analytics-shared";
import { taka } from "./format";

// A change is only shown when there is a previous period to compare against
// and that period wasn't zero. Growth "from nothing" has no percentage, and
// printing one would be inventing a number.
function Delta({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number | null;
  invert?: boolean;
}) {
  if (previous === null) return null;
  const change = percentChange(current, previous);

  if (change === null) {
    return (
      <p className="text-[11px] text-gray-400 mt-0.5">
        {previous === 0 && current > 0
          ? "no comparison — previous period was zero"
          : "no change"}
      </p>
    );
  }

  const flat = Math.abs(change) < 0.05;
  const good = invert ? change < 0 : change > 0;
  const Icon = flat ? Minus : change > 0 ? TrendingUp : TrendingDown;

  return (
    <p
      className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${
        flat ? "text-gray-400" : good ? "text-emerald-600" : "text-red-600"
      }`}
    >
      <Icon className="w-3 h-3" />
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%
      <span className="font-normal text-gray-400">vs previous</span>
    </p>
  );
}

function Card({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function KpiCards({
  totals,
  previous,
  canSeeMoney,
}: {
  totals: Totals;
  previous: Totals | null;
  canSeeMoney: boolean;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {canSeeMoney && (
        <Card label="Revenue" value={taka(totals.revenueCents)}>
          <Delta current={totals.revenueCents} previous={previous?.revenueCents ?? null} />
        </Card>
      )}

      <Card label="Orders" value={String(totals.orders)} hint="confirmed and beyond">
        <Delta current={totals.orders} previous={previous?.orders ?? null} />
      </Card>

      {canSeeMoney && (
        <Card label="Average order" value={taka(totals.aovCents)}>
          <Delta current={totals.aovCents} previous={previous?.aovCents ?? null} />
        </Card>
      )}

      <Card label="Units sold" value={String(totals.units)}>
        <Delta current={totals.units} previous={previous?.units ?? null} />
      </Card>

      <Card label="Delivered" value={String(totals.delivered)}>
        <Delta current={totals.delivered} previous={previous?.delivered ?? null} />
      </Card>

      <Card
        label="Pending"
        value={String(totals.pending)}
        hint="awaiting your call"
      >
        <Delta
          current={totals.pending}
          previous={previous?.pending ?? null}
          invert
        />
      </Card>

      <Card label="Cancelled" value={String(totals.cancelled)}>
        <Delta
          current={totals.cancelled}
          previous={previous?.cancelled ?? null}
          invert
        />
      </Card>

      {canSeeMoney && (
        <Card
          label="Gross profit"
          value={totals.profitCents === null ? "—" : taka(totals.profitCents)}
          hint={
            totals.profitCents === null
              ? "no cost prices on the items sold"
              : "estimate — see the profit section"
          }
        >
          {totals.profitCents !== null && (
            <Delta
              current={totals.profitCents}
              previous={previous?.profitCents ?? null}
            />
          )}
        </Card>
      )}
    </div>
  );
}
