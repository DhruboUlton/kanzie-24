"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  Check,
  XCircle,
  MessageSquare,
  Loader2,
  MapPin,
  Mail,
  Phone,
  PhoneCall,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { updateOrderStatusAction, addOrderNoteAction } from "@/lib/actions/order";
import PackingSlip from "@/components/admin/PackingSlip";

export default function OrderDetailClient({ order }: { order: any }) {
  const router = useRouter();
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

  const statusStyles: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PACKED: "bg-blue-50 text-blue-700 border-blue-200",
    SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    DELIVERED: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-mono text-gray-900">
                #{order.tranId}
              </h2>
              <span
                className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border ${
                  statusStyles[order.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PackingSlip order={order} />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 span): Items, Order Status Workflow, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Workflow Action Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Fulfillment Workflow Actions
            </h3>

            <div className="flex flex-wrap gap-2.5">
              {order.status === "PENDING" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange("CONFIRMED")}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Confirm Order (Called Customer)</span>
                </button>
              )}

              {order.status === "CONFIRMED" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange("PACKED")}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Mark as Packed</span>
                </button>
              )}

              {(order.status === "PACKED" || order.status === "CONFIRMED") && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking / Courier Code (e.g. STEADFAST-123)"
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs w-64 focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleStatusChange("SHIPPED")}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
                  className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark as Delivered</span>
                </button>
              )}

              {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 ml-auto"
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
                      <Link
                        href={`/products/${item.productSlug}`}
                        target="_blank"
                        className="hover:text-accent transition-colors"
                      >
                        {item.productName}
                      </Link>
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
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase">
                Grand Total (Inc. delivery)
              </span>
              <span className="text-xl font-extrabold text-gray-900 font-display">
                {formatPrice(order.totalAmountCents)}
              </span>
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
                      <span className="font-bold text-gray-900">{ev.status}</span>
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
                <span className="font-mono">{order.customerPhone}</span>
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
                  {order.customerCity}, Bangladesh
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

              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Confirmed By Call:</span>
                <span className="font-semibold text-gray-900">
                  {order.status === "PENDING" ? "Not yet — call customer" : "Yes"}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-500">Tracking Code:</span>
                <span className="font-bold text-indigo-700">
                  {order.trackingNumber || "Not assigned yet"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
