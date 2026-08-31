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

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage(props: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
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
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Packed", value: "PACKED" },
    { label: "Shipped", value: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  const statusStyles: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PACKED: "bg-blue-50 text-blue-700 border-blue-200",
    SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    DELIVERED: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
  };

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
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
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
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto text-xs">
          {statuses.map((st) => (
            <Link
              key={st.value}
              href={`/admin/orders?status=${st.value}${query ? `&q=${query}` : ""}`}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
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

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No orders found.</p>
              <p className="text-xs text-gray-400 mt-1">
                Completed checkout sessions will automatically be recorded here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">Transaction ID</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Customer & City</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const itemCount = order.items?.reduce(
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
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                            statusStyles[order.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

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
          )}
        </div>
      </div>
    </div>
  );
}
