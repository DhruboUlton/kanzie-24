import Link from "next/link";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  PlusCircle,
  FolderTree,
  Settings,
  ArrowRight,
  CheckCircle2,
  Clock,
  Truck,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { getLowStockThreshold } from "@/lib/inventory";
import { requirePageAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // The dashboard is the one page every signed-in staff member can open,
  // so it earns its content per permission rather than gating the route.
  const ctx = await requirePageAdmin();
  const can = (p: Parameters<typeof ctx.permissions.includes>[0]) =>
    ctx.permissions.includes(p);

  const canSeeOrders = can("ORDERS_VIEW");
  const canSeeMoney = can("FINANCE_VIEW");
  const canSeeProducts = can("PRODUCTS_VIEW");
  const canSeeStock = can("INVENTORY_VIEW");
  const canSeeCategories = can("CATEGORIES_VIEW");

  // Aggregate Metrics safely (with fallback if DB empty)
  let totalRevenueCents = 0;
  let totalOrdersCount = 0;
  let confirmedOrdersCount = 0;
  let pendingOrdersCount = 0;
  let recentOrders: any[] = [];
  let totalProductsCount = 0;
  let lowStockProducts: any[] = [];
  let categoriesCount = 0;

  try {
    const orders = canSeeOrders
      ? await db.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { items: true },
        })
      : [];

    totalOrdersCount = orders.length;
    recentOrders = orders.slice(0, 5);

    for (const ord of orders) {
      if (
        ord.status === "CONFIRMED" ||
        ord.status === "PACKED" ||
        ord.status === "SHIPPED" ||
        ord.status === "DELIVERED"
      ) {
        totalRevenueCents += ord.totalAmountCents;
        confirmedOrdersCount++;
      } else if (ord.status === "PENDING") {
        pendingOrdersCount++;
      }
    }

    const products = canSeeProducts
      ? await db.product.findMany({
          where: { archivedAt: null },
          include: { category: true },
        })
      : [];
    totalProductsCount = products.length;
    // Per-product override first, store-wide setting otherwise — same rule
    // the Inventory screen uses, so the two never disagree.
    if (canSeeStock) {
      const lowStockThreshold = await getLowStockThreshold();
      lowStockProducts = products.filter(
        (p) => (p.stockQty ?? 0) <= (p.lowStockThreshold ?? lowStockThreshold),
      );
    }

    categoriesCount = canSeeCategories ? await db.category.count() : 0;
  } catch (error) {
    console.warn("Dashboard stats DB query fallback:", error);
  }

  const statCards = [
    canSeeMoney && {
      title: "Total Revenue",
      value: formatPrice(totalRevenueCents),
      subtitle: `${confirmedOrdersCount} confirmed orders`,
      icon: TrendingUp,
      iconBg: "bg-emerald-50 text-emerald-600",
      border: "border-emerald-100",
    },
    canSeeOrders && {
      title: "Total Orders",
      value: totalOrdersCount.toString(),
      subtitle: `${pendingOrdersCount} awaiting your call`,
      icon: ShoppingCart,
      iconBg: "bg-blue-50 text-blue-600",
      border: "border-blue-100",
    },
    canSeeProducts && {
      title: "Active Products",
      value: totalProductsCount.toString(),
      subtitle: canSeeStock
        ? `${lowStockProducts.length} low in stock`
        : "In the catalogue",
      icon: Package,
      iconBg: "bg-amber-50 text-amber-600",
      border: "border-amber-100",
    },
    canSeeCategories && {
      title: "Categories",
      value: categoriesCount.toString(),
      subtitle: "Construction machinery",
      icon: FolderTree,
      iconBg: "bg-purple-50 text-purple-600",
      border: "border-purple-100",
    },
  ].filter(Boolean) as {
    title: string;
    value: string;
    subtitle: string;
    icon: typeof TrendingUp;
    iconBg: string;
    border: string;
  }[];


  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Welcome to KANZIE Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Monitor inventory, process customer orders, and update store content.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {canSeeProducts && can("PRODUCTS_CREATE") && (
          <Link
            href="/adpnl/products/new"
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
          )}
          {canSeeOrders && (
          <Link
            href="/adpnl/orders"
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Orders</span>
          </Link>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`bg-white p-4 sm:p-6 rounded-xl border ${card.border} shadow-xs flex items-start justify-between`}
            >
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 font-display">
                  {card.value}
                </p>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-2.5 sm:p-3 rounded-lg ${card.iconBg}`}>
                <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Recent Orders & Alerts/Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Orders List (2 Cols) */}
        {canSeeOrders && (
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Recent Orders</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Latest customer purchases and gateway transactions
              </p>
            </div>
            <Link
              href="/adpnl/orders"
              className="text-xs font-semibold text-[#c0282b] hover:text-[#8f1e20] flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-gray-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No orders recorded yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Orders completed at checkout will appear here in real-time.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-4 sm:px-6 py-3">Order ID</th>
                    <th className="px-4 sm:px-6 py-3">Customer</th>
                    <th className="px-4 sm:px-6 py-3">Total</th>
                    <th className="px-4 sm:px-6 py-3">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => {
                    const statusColors: Record<string, string> = {
                      CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                      PACKED: "bg-blue-50 text-blue-700 border-blue-200",
                      SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
                      DELIVERED: "bg-green-50 text-green-700 border-green-200",
                      CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
                    };

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-mono text-xs font-semibold text-gray-900 whitespace-nowrap">
                          {order.tranId}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <div className="font-medium text-gray-900 text-xs sm:text-sm">
                            {order.customerName}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {order.customerCity}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 font-semibold text-gray-900 text-xs sm:text-sm whitespace-nowrap font-display">
                          {formatPrice(order.totalAmountCents)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap ${
                              statusColors[order.status] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <Link
                            href={`/adpnl/orders/${order.id}`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Details
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
        )}

        {/* Sidebar Column: Stock Alerts & Quick Navigation */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          {canSeeStock && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Stock Notifications</span>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-gray-500">
                All catalog items currently have adequate stock levels.
              </p>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-50/60 border border-amber-100"
                  >
                    <span className="font-medium text-gray-800 truncate max-w-[170px]">
                      {p.name}
                    </span>
                    <span className="font-bold text-amber-700 shrink-0">
                      {p.stockQty ?? 0} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Quick Management Shortcuts */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Quick Shortcuts
            </h4>
            {canSeeProducts && (
            <Link
              href="/adpnl/products"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-xs font-semibold text-gray-700"
            >
              <span className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-accent" />
                <span>Manage Products Catalog</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            )}

            {canSeeCategories && (
            <Link
              href="/adpnl/categories"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-xs font-semibold text-gray-700"
            >
              <span className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4 text-purple-600" />
                <span>Categories & Layout</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            )}

            {can("SETTINGS_VIEW") && (
            <Link
              href="/adpnl/settings"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-xs font-semibold text-gray-700"
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-gray-600" />
                <span>Announcement & Store Settings</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
