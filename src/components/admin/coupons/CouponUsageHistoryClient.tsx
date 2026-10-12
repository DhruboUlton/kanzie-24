"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  RotateCcw,
  Search,
} from "lucide-react";
import { CouponUsageRowView } from "@/lib/coupons-shared";
import { formatPrice } from "@/lib/format";
import { realCustomerEmail } from "@/lib/customer-email";

export default function CouponUsageHistoryClient({
  usages,
  total,
  page,
  pageSize,
  filters,
  loadError,
}: {
  usages: CouponUsageRowView[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; coupon: string; status: string; from: string; to: string };
  loadError: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  function applyParams(
    next: Partial<{ q: string; status: string; from: string; to: string; page: number }>,
  ) {
    const params = new URLSearchParams();
    const q = next.q ?? filters.q;
    const status = next.status ?? filters.status;
    const from = next.from ?? filters.from;
    const to = next.to ?? filters.to;
    const nextPage = next.page ?? 1;

    if (q.trim()) params.set("q", q.trim());
    if (filters.coupon) params.set("coupon", filters.coupon);
    if (status !== "all") params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (nextPage > 1) params.set("page", String(nextPage));

    const query = params.toString();
    startTransition(() =>
      router.push(query ? `/adpnl/coupons/usage?${query}` : "/adpnl/coupons/usage"),
    );
  }

  useEffect(() => {
    if (search === filters.q) return;
    const timer = setTimeout(() => applyParams({ q: search }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Sums this page only, and says so on screen — a figure covering every
  // matching row would need its own aggregate query.
  const pageDiscount = useMemo(
    () => usages.reduce((sum, u) => sum + (u.releasedAt ? 0 : u.discountAmountCents), 0),
    [usages],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/adpnl/coupons"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Coupon Usage History</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
                {total} redemption{total === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Append-only audit trail of all successful coupon redemptions linked to store orders
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-gray-500 block">Discount on this page</span>
          <span className="text-xl font-extrabold text-purple-700 font-display">
            {formatPrice(pageDiscount)}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search coupon code, order ID, customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c0282b]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-medium">Order Status:</span>
            <select
              value={filters.status}
              onChange={(e) => applyParams({ status: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none"
            >
              <option value="all">All Orders</option>
              <option value="PENDING">Pending</option>
              <option value="CALLED">Called</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PACKED">Packed</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-medium">From:</span>
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => applyParams({ from: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-medium">To:</span>
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => applyParams({ to: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none"
            />
          </div>

          {(filters.q || filters.status !== "all" || filters.from || filters.to || filters.coupon) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                startTransition(() => router.push("/adpnl/coupons/usage"));
              }}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Usages Table */}
      <div className={`bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden ${pending ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Coupon</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Subtotal</th>
                <th className="px-5 py-3">Final Total</th>
                <th className="px-5 py-3">Redeemed At</th>
                <th className="px-5 py-3">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-600">No usage records found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {filters.q || filters.status !== "all" || filters.from || filters.to
                        ? "No redemptions match your query."
                        : "Redemptions will appear here once customers use coupons."}
                    </p>
                  </td>
                </tr>
              ) : (
                usages.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Order */}
                    <td className="px-5 py-3.5 font-mono">
                      <Link
                        href={`/adpnl/orders/${u.orderId}`}
                        className="font-bold text-xs text-[#c0282b] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{u.tranId || u.orderId}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>

                    {/* Coupon */}
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/adpnl/coupons/${u.couponId}`}
                        className="font-mono font-bold text-xs text-gray-900 hover:text-[#c0282b] bg-gray-100 px-2 py-0.5 rounded transition-colors"
                      >
                        {u.couponCode}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{u.customerName || "Customer"}</div>
                      <div className="text-[11px] text-gray-400">
                        {u.customerPhone} {realCustomerEmail(u.customerEmail) && `· ${realCustomerEmail(u.customerEmail)}`}
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="px-5 py-3.5 font-display">
                      {u.releasedAt ? (
                        <div>
                          <span className="font-bold text-gray-400 line-through">
                            -{formatPrice(u.discountAmountCents)}
                          </span>
                          <div
                            className="text-[10px] font-bold uppercase tracking-wide text-gray-400"
                            title="The order was cancelled, so this use was given back to the coupon."
                          >
                            Released
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-emerald-600">
                          -{formatPrice(u.discountAmountCents)}
                        </span>
                      )}
                    </td>

                    {/* Subtotal */}
                    <td className="px-5 py-3.5 text-gray-500">
                      {formatPrice(u.orderSubtotalCents)}
                    </td>

                    {/* Final Total */}
                    <td className="px-5 py-3.5 font-bold text-gray-900 font-display">
                      {formatPrice(u.finalOrderAmountCents)}
                    </td>

                    {/* Redeemed At */}
                    <td className="px-5 py-3.5 text-gray-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                        {u.orderStatus || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
          <span className="text-xs text-gray-500">
            Showing <strong className="text-gray-700">{firstRow}–{lastRow}</strong> of{" "}
            <strong className="text-gray-700">{total}</strong>
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyParams({ page: page - 1 })}
                disabled={page <= 1 || pending}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="px-2 text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => applyParams({ page: page + 1 })}
                disabled={page >= totalPages || pending}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
