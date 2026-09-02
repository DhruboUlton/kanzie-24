"use client";

import { TimePoint } from "@/lib/analytics-shared";
import { takaExact } from "./format";

export default function PerformanceTable({
  series,
  granularity,
  canSeeMoney,
}: {
  series: TimePoint[];
  granularity: "day" | "month";
  canSeeMoney: boolean;
}) {
  // Quiet buckets are dropped here — the charts need them to keep the time
  // axis honest, but a table of empty rows is just noise to scroll past.
  const rows = series.filter(
    (p) => p.orders > 0 || p.revenueCents > 0 || p.cancelled > 0,
  );

  const totals = rows.reduce(
    (acc, r) => ({
      orders: acc.orders + r.orders,
      revenueCents: acc.revenueCents + r.revenueCents,
      delivered: acc.delivered + r.delivered,
      cancelled: acc.cancelled + r.cancelled,
      profitCents:
        r.profitCents === null ? acc.profitCents : acc.profitCents + r.profitCents,
    }),
    { orders: 0, revenueCents: 0, delivered: 0, cancelled: 0, profitCents: 0 },
  );

  // A total of zero and "no costed sales at all" are different answers.
  // Summing nulls as zero would print ৳0.00 profit where the KPI card
  // correctly says there is nothing to calculate from.
  const hasProfit = rows.some((r) => r.profitCents !== null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
          Performance by {granularity === "month" ? "month" : "day"}
        </h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Periods with no activity are left out
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-gray-500">
          Nothing happened in this period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Orders</th>
                {canSeeMoney && <th className="px-4 py-3 text-right">Revenue</th>}
                {canSeeMoney && <th className="px-4 py-3 text-right">AOV</th>}
                <th className="px-4 py-3 text-right hidden sm:table-cell">Delivered</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Cancelled</th>
                {canSeeMoney && (
                  <th className="px-4 py-3 text-right hidden lg:table-cell">
                    Est. profit
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.bucket} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                    {r.label}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.orders}</td>
                  {canSeeMoney && (
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      {takaExact(r.revenueCents)}
                    </td>
                  )}
                  {canSeeMoney && (
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                      {r.orders > 0
                        ? takaExact(Math.round(r.revenueCents / r.orders))
                        : "—"}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell text-gray-600">
                    {r.delivered}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell text-gray-600">
                    {r.cancelled}
                  </td>
                  {canSeeMoney && (
                    <td className="px-4 py-2.5 text-right tabular-nums hidden lg:table-cell text-emerald-600">
                      {r.profitCents === null ? "—" : takaExact(r.profitCents)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr className="text-xs font-bold text-gray-900">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.orders}</td>
                {canSeeMoney && (
                  <td className="px-4 py-3 text-right tabular-nums">
                    {takaExact(totals.revenueCents)}
                  </td>
                )}
                {canSeeMoney && (
                  <td className="px-4 py-3 text-right tabular-nums">
                    {totals.orders > 0
                      ? takaExact(Math.round(totals.revenueCents / totals.orders))
                      : "—"}
                  </td>
                )}
                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                  {totals.delivered}
                </td>
                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                  {totals.cancelled}
                </td>
                {canSeeMoney && (
                  <td className="px-4 py-3 text-right tabular-nums hidden lg:table-cell text-emerald-600">
                    {hasProfit ? takaExact(totals.profitCents) : "—"}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
