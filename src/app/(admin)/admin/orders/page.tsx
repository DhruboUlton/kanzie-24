import Link from "next/link";
import {
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  Filter,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";
import OrderFraudCheck from "@/components/admin/OrderFraudCheck";
import { ORDER_STATUS_BADGES } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage(props: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const { ctx, allowed } = await requirePageAccess("ORDERS_VIEW");
  if (!allowed) return <NoAccess what="orders" />;

  // The courier lookup is its own permission — seeing an order is not the
  // same as being allowed to pull a customer's delivery history.
  const canFraudCheck = ctx.permissions.includes("FRAUD_CHECK_VIEW");

  const searchParams = (await props.searchParams) || {};
  const query = searchParams.q?.toLowerCase() || "";
  const statusFilter = searchParams.status || "ALL";

  let orders: any[] = [];

  try {
    orders = await db.order.findMany({
      where: {
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.warn("DB orders fetch fallback:", error);
  }

  const filteredOrders = orders.filter((o) => {
    if (!query) return true;
    return (
      o.tranId.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query) ||
      o.customerPhone.toLowerCase().includes(query) ||
      o.customerEmail.toLowerCase().includes(query)
    );
  });

  const statuses = [
    { label: "All Orders", value: "ALL" },
    { label: "Pending Call", value: "PENDING" },
    { label: "Called", value: "CALLED" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Packed", value: "PACKED" },
    { label: "Shipped", value: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Orders Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track customer payments, fulfillment, packaging, and courier delivery
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <form method="GET" className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by TranID, Name, Phone..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#c0282b]"
          />
        </form>

        {/* Status pill selectors */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto text-xs scrollbar-none">
          {statuses.map((st) => (
            <Link
              key={st.value}
              href={`/admin/orders?status=${st.value}${query ? `&q=${query}` : ""}`}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st.value
                  ? "bg-white text-gray-900 font-bold shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {st.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Orders Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-gray-400">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No orders found.</p>
            <p className="text-xs text-gray-400 mt-1">
              Completed checkout sessions will automatically be recorded here.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (below md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const itemCount =
                  order.items?.reduce(
                    (acc: number, item: any) => acc + item.qty,
                    0
                  ) || 1;

                return (
                  <div
                    key={order.id}
                    className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-xs font-bold text-gray-900 hover:text-accent"
                        >
                          #{order.tranId}
                        </Link>
                        {order.cardType && (
                          <span className="text-[10px] text-gray-400 ml-1.5">
                            ({order.cardType})
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            ORDER_STATUS_BADGES[order.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status}
                        </span>
                        {order.calledByName && (
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            by {order.calledByName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {order.customerName}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono truncate">
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="text-indigo-600 hover:underline"
                          >
                            {order.customerPhone}
                          </a>{" "}
                          &middot; {order.customerCity}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 text-sm font-display">
                          {formatPrice(order.totalAmountCents)}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {itemCount} {itemCount === 1 ? "unit" : "units"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <div className="min-w-0">
                        {canFraudCheck && (
                          <OrderFraudCheck phone={order.customerPhone} />
                        )}
                      </div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition-colors ml-auto shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Transaction ID</th>
                    <th className="px-6 py-3.5">Date &amp; Time</th>
                    <th className="px-6 py-3.5">Customer &amp; City</th>
                    <th className="px-6 py-3.5">Items</th>
                    <th className="px-6 py-3.5">Total Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    {canFraudCheck && (
                      <th className="px-6 py-3.5">Courier History</th>
                    )}
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => {
                    const itemCount =
                      order.items?.reduce(
                        (acc: number, item: any) => acc + item.qty,
                        0
                      ) || 1;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        {/* TranID & Gateway */}
                        <td className="px-6 py-4">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono text-xs font-bold text-gray-900 hover:text-accent transition-colors"
                          >
                            {order.tranId}
                          </Link>
                          {order.cardType && (
                            <span className="block text-[11px] text-gray-400">
                              {order.cardType}
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">
                            {order.customerName}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {order.customerPhone} &middot; {order.customerCity}
                          </div>
                        </td>

                        {/* Items */}
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {itemCount} {itemCount === 1 ? "unit" : "units"}
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4 font-bold text-gray-900 font-display">
                          {formatPrice(order.totalAmountCents)}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                              ORDER_STATUS_BADGES[order.status] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {order.status}
                          </span>
                          {order.calledByName && (
                            <span className="block text-[11px] text-gray-400 mt-1">
                              Called by {order.calledByName}
                            </span>
                          )}
                        </td>

                        {/* Courier history */}
                        {canFraudCheck && (
                          <td className="px-6 py-4">
                            <OrderFraudCheck phone={order.customerPhone} />
                          </td>
                        )}

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
