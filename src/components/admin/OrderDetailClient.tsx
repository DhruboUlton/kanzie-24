"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  Box,
  Check,
  XCircle,
  Loader2,
  MapPin,
  Mail,
  Phone,
  PhoneCall,
  PhoneOutgoing,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  updateOrderStatusAction,
  addOrderNoteAction,
  markOrderCalledAction,
} from "@/lib/actions/order";
import PackingSlip from "@/components/admin/PackingSlip";
import OrderFraudCheck from "@/components/admin/OrderFraudCheck";
import { ORDER_STATUS_BADGES } from "@/lib/order-status";

export default function OrderDetailClient({
  order,
  canFraudCheck = false,
}: {
  order: any;
  canFraudCheck?: boolean;
}) {
  const router = useRouter();
  // Summed from the lines rather than read back out of the total: the total
  // now carries a delivery charge, and deriving the subtotal from it printed
  // a figure the item table above could not account for. Delivery is what is
  // left once the lines and the discount are taken off, which is also how an
  // order placed before delivery was charged reports zero.
  const itemsSubtotalCents: number = (order.items ?? []).reduce(
    (sum: number, item: any) => sum + (item.totalPriceCents ?? 0),
    0,
  );
  const deliveryCents =
    typeof order.shippingAmountCents === "number"
      ? order.shippingAmountCents
      : Math.max(
          0,
          order.totalAmountCents + order.discountAmountCents - itemsSubtotalCents,
        );
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateOrderStatusAction(
        order.id,
        newStatus,
        `Status updated to ${newStatus}`,
        newStatus === "SHIPPED" ? trackingNumber : undefined
      );
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || "Failed to update status");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCalled = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await markOrderCalledAction(order.id);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || "Failed to record the call");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setLoading(true);
    try {
      const res = await addOrderNoteAction(order.id, note);
      if (res.success) {
        setNote("");
        router.refresh();
      } else {
        setError(res.error || "Failed to add note");
      }
    } catch (err: any) {
      setError(err.message || "Failed to add note");
    } finally {
      setLoading(false);
    }
  };

  const calledAt = order.calledAt ? new Date(order.calledAt) : null;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/adpnl/orders"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-lg sm:text-xl font-bold font-mono text-gray-900 truncate">
                #{order.tranId}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 sm:px-3 py-0.5 rounded-full text-xs font-bold border ${
                  ORDER_STATUS_BADGES[order.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <PackingSlip order={order} />
        </div>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column (2 span): Items, Order Status Workflow, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Workflow Action Card */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Fulfillment Workflow Actions
            </h3>

            {order.status === "CALLED" && (
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs">
                <span className="font-semibold">
                  {order.calledByName
                    ? `${order.calledByName} called this customer`
                    : "Customer called"}
                  {calledAt
                    ? ` on ${calledAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                  .
                </span>{" "}
                What did they say?
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              {/* Ringing the customer */}
              {order.status === "PENDING" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleMarkCalled}
                  className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PhoneOutgoing className="w-3.5 h-3.5" />
                  )}
                  <span>Mark as Called</span>
                </button>
              )}

              {order.status === "CALLED" && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleStatusChange("CONFIRMED")}
                    className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Customer Confirmed</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleStatusChange("CANCELLED")}
                    className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Customer Cancelled</span>
                  </button>
                </>
              )}

              {order.status === "CONFIRMED" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange("PACKED")}
                  className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Mark as Packed</span>
                </button>
              )}

              {(order.status === "PACKED" || order.status === "CONFIRMED") && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking / Courier Code (e.g. STEADFAST-123)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full sm:w-64 focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleStatusChange("SHIPPED")}
                    className="justify-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch / Shipped</span>
                  </button>
                </div>
              )}

              {order.status === "SHIPPED" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange("DELIVERED")}
                  className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark as Delivered</span>
                </button>
              )}

              {order.status !== "CANCELLED" &&
                order.status !== "DELIVERED" &&
                order.status !== "CALLED" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="w-full sm:w-auto justify-center px-3.5 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 sm:ml-auto"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Purchased Items ({order.items?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3 text-right">Unit Price</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {item.productDeletedAt ? (
                        // No link: the storefront page is gone with the
                        // product. The order keeps what it sold and says
                        // what became of it.
                        <>
                          <span>{item.productName}</span>
                          <span className="block text-[11px] font-medium text-red-600 mt-0.5">
                            Product deleted
                            {item.productDeletedBy ? ` by ${item.productDeletedBy}` : ""} on{" "}
                            {new Date(item.productDeletedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </>
                      ) : (
                        <Link
                          href={`/products/${item.productSlug}`}
                          target="_blank"
                          className="hover:text-accent transition-colors"
                        >
                          {item.productName}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {item.productSku}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      {formatPrice(item.unitPriceCents)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 font-display">
                      {formatPrice(item.totalPriceCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Total Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Items Subtotal</span>
                <span className="font-semibold text-gray-700">
                  {formatPrice(itemsSubtotalCents)}
                </span>
              </div>
              {order.discountAmountCents > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold">Coupon Applied:</span>
                    {order.couponCode && (
                      <span className="font-mono bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px] text-emerald-800">
                        {order.couponCode}
                      </span>
                    )}
                  </span>
                  <span>-{formatPrice(order.discountAmountCents)}</span>
                </div>
              )}
              {deliveryCents > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Delivery</span>
                  <span className="font-semibold text-gray-700">
                    {formatPrice(deliveryCents)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Grand Total
                </span>
                <span className="text-xl font-extrabold text-gray-900 font-display">
                  {formatPrice(order.totalAmountCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Order Event Timeline
            </h3>

            <div className="space-y-4 pt-2">
              {order.events?.map((ev: any, i: number) => (
                <div key={ev.id || i} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">
                        {ev.status}
                        {ev.actorName && (
                          <span className="font-normal text-gray-400">
                            {" "}
                            · {ev.actorName}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(ev.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {ev.note && <p className="text-gray-600 mt-0.5">{ev.note}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Add note form */}
            <form onSubmit={handleAddNote} className="pt-4 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an internal order note..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
              />
              <button
                type="submit"
                disabled={loading || !note.trim()}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors disabled:opacity-50"
              >
                Add Note
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Customer & Payment Details */}
        <div className="space-y-6">
          {/* Customer Details Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Customer Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase">
                  Full Name
                </p>
                <p className="font-bold text-sm text-gray-900 mt-0.5">
                  {order.customerName}
                </p>
              </div>

              <div className="flex items-start gap-2 text-gray-700">
                <Phone className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <a
                  href={`tel:${order.customerPhone}`}
                  className="font-mono text-indigo-600 hover:underline"
                >
                  {order.customerPhone}
                </a>
              </div>

              <div className="flex items-start gap-2 text-gray-700">
                <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span>{order.customerEmail}</span>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Delivery Address</span>
                </p>
                <p className="text-gray-800 leading-relaxed">
                  {order.customerAddress}
                </p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {order.customerCity}
              {order.customerPostalCode ? ` - ${order.customerPostalCode}` : ""}, Bangladesh
                </p>
              </div>
            </div>
          </div>

          {/* Order Confirmation Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-accent" />
              <span>Order Confirmation</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-gray-900">{order.status}</span>
              </div>

              <div className="flex justify-between gap-3 py-1 border-b border-gray-100">
                <span className="text-gray-500 shrink-0">Called By:</span>
                <span className="font-semibold text-gray-900 text-right">
                  {order.calledByName ? (
                    <>
                      {order.calledByName}
                      {calledAt && (
                        <span className="block text-[11px] font-normal text-gray-400">
                          {calledAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </>
                  ) : order.status === "PENDING" ? (
                    <span className="text-gray-400">Not yet — call customer</span>
                  ) : (
                    // Orders decided before the call step existed have no
                    // caller on file. Say so rather than implying nobody rang.
                    <span className="text-gray-400">Not recorded</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Tracking Code:</span>
                <span className="font-bold text-indigo-700">
                  {order.trackingNumber || "Not assigned yet"}
                </span>
              </div>

              {/* Right where the confirm-or-cancel decision gets made. */}
              {canFraudCheck && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-gray-500">Courier history:</span>
                  <OrderFraudCheck phone={order.customerPhone} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
