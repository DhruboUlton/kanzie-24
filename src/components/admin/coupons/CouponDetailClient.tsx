"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Pencil,
  Power,
  Copy,
  Check,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import {
  CouponView,
  CouponUsageRowView,
  formatDiscountValue,
} from "@/lib/coupons-shared";
import { formatPrice } from "@/lib/format";
import { toggleCouponActiveAction } from "@/lib/actions/coupons";
import EditCouponDialog from "./EditCouponDialog";
import { realCustomerEmail } from "@/lib/customer-email";

export default function CouponDetailClient({
  coupon,
  usages,
  usageTotal,
  canManage,
}: {
  coupon: CouponView;
  usages: CouponUsageRowView[];
  usageTotal: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggleActive() {
    if (!canManage) return;
    setBusy(true);
    setActionError(null);
    try {
      // Refusals come back in the result, not as a throw, so the return value
      // has to be read or a rejected toggle passes for a successful one.
      const res = await toggleCouponActiveAction(coupon.id);
      if (!res.success) {
        setActionError(res.error || "Couldn't change this coupon's status.");
        return;
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setActionError("Couldn't change this coupon's status.");
    } finally {
      setBusy(false);
    }
  }

  const isLimitReached = coupon.status === "Limit Reached";
  const isInactive = coupon.status === "Inactive";

  // Calculate consumption percentage
  const consumedPercent =
    coupon.usageLimit !== null && coupon.usageLimit > 0
      ? Math.min(100, Math.round((coupon.usageCount / coupon.usageLimit) * 100))
      : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-gray-900 tracking-wider">
                {coupon.code}
              </h1>
              <button
                type="button"
                onClick={handleCopy}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Status Badge */}
              {isInactive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                  Inactive
                </span>
              ) : isLimitReached ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Limit Reached
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Created on {new Date(coupon.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 hover:border-gray-400 bg-white text-gray-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-500" />
              <span>Edit Note &amp; Limit</span>
            </button>

            <button
              type="button"
              onClick={handleToggleActive}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-2xs ${
                coupon.isActive
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{coupon.isActive ? "Deactivate Coupon" : "Activate Coupon"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Overview Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Discount Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
            Discount Value
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900">
              {formatDiscountValue(coupon.discountType, coupon.discountValue)}
            </span>
            <span className="text-xs text-gray-500">
              {coupon.discountType === "PERCENTAGE" ? "off order" : "fixed off"}
            </span>
          </div>
        </div>

        {/* Min Order */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
            Minimum Order
          </span>
          <span className="text-2xl font-extrabold text-gray-900">
            {coupon.minimumOrderAmountCents
              ? formatPrice(coupon.minimumOrderAmountCents)
              : "No Minimum"}
          </span>
        </div>

        {/* Usage Limit */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
            Usage Limit
          </span>
          <span className="text-2xl font-extrabold text-gray-900">
            {coupon.usageLimit !== null ? `${coupon.usageLimit} max` : "Unlimited"}
          </span>
        </div>

        {/* Remaining Uses */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
            Remaining Uses
          </span>
          <span className={`text-2xl font-extrabold ${coupon.remainingUses === 0 ? "text-amber-600" : "text-gray-900"}`}>
            {coupon.remainingUses !== null ? coupon.remainingUses : "Unlimited"}
          </span>
        </div>
      </div>

      {/* Usage Progress Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Usage Progress
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Live consumption counter across all customers
            </p>
          </div>

          <div className="text-right">
            {coupon.usageLimit !== null ? (
              <div>
                <span className="text-lg font-extrabold text-gray-900">
                  {coupon.usageCount} / {coupon.usageLimit} Used
                </span>
                <span className="text-xs text-gray-500 block">
                  {coupon.remainingUses} Remaining ({consumedPercent}% consumed)
                </span>
              </div>
            ) : (
              <div>
                <span className="text-lg font-extrabold text-gray-900">
                  {coupon.usageCount} Uses
                </span>
                <span className="text-xs text-gray-500 block">Unlimited Remaining</span>
              </div>
            )}
          </div>
        </div>

        {coupon.usageLimit !== null && (
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isLimitReached
                  ? "bg-amber-500"
                  : (consumedPercent || 0) >= 80
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${consumedPercent}%` }}
            />
          </div>
        )}

        {coupon.note && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Internal Admin Note:
            </span>
            <p className="text-xs text-gray-700">{coupon.note}</p>
          </div>
        )}
      </div>

      {/* Usage Redemptions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Redemption History
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {usageTotal} {usageTotal === 1 ? "redemption" : "redemptions"} recorded for this coupon
              {usages.length < usageTotal && ` — showing the latest ${usages.length}`}
            </p>
          </div>

          {usages.length < usageTotal && (
            <Link
              href={`/adpnl/coupons/usage?coupon=${coupon.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              View all
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Order Value</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    <ShoppingBag className="w-7 h-7 mx-auto mb-1.5 text-gray-300" />
                    <p className="font-semibold text-gray-600">No redemptions yet</p>
                    <p className="text-xs text-gray-400">This coupon has not been used in any orders.</p>
                  </td>
                </tr>
              ) : (
                usages.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Order ID Link */}
                    <td className="px-5 py-3.5 font-mono">
                      <Link
                        href={`/adpnl/orders/${u.orderId}`}
                        className="font-bold text-xs text-[#c0282b] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{u.tranId || u.orderId}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{u.customerName || "Guest"}</div>
                      <div className="text-[11px] text-gray-400">
                        {u.customerPhone} {realCustomerEmail(u.customerEmail) && `· ${realCustomerEmail(u.customerEmail)}`}
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="px-5 py-3.5 font-bold text-emerald-600 font-display">
                      {u.releasedAt ? (
                        <span
                          className="text-gray-400 line-through"
                          title="The order was cancelled, so this use was given back to the coupon."
                        >
                          -{formatPrice(u.discountAmountCents)}
                        </span>
                      ) : (
                        <>-{formatPrice(u.discountAmountCents)}</>
                      )}
                    </td>

                    {/* Order Value */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900 font-display">
                        {formatPrice(u.finalOrderAmountCents)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Subtotal: {formatPrice(u.orderSubtotalCents)}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-gray-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Order Status */}
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
      </div>

      <EditCouponDialog
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        coupon={coupon}
      />
    </div>
  );
}
