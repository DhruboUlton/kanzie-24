"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Sparkles,
  Search,
  History,
  AlertTriangle,
  ShoppingBag,
  TrendingDown,
  Tag,
  Power,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  CouponView,
  CouponDashboardMetrics,
  formatDiscountValue,
} from "@/lib/coupons-shared";
import { formatPrice } from "@/lib/format";
import { toggleCouponActiveAction } from "@/lib/actions/coupons";
import CreateCouponDialog from "./CreateCouponDialog";
import GenerateRandomCouponsDialog from "./GenerateRandomCouponsDialog";

export default function CouponDashboardClient({
  metrics,
  coupons,
  total,
  page,
  pageSize,
  filters,
  loadError,
  isOwner,
  canManage,
}: {
  metrics: CouponDashboardMetrics;
  coupons: CouponView[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; status: string; type: string };
  loadError: string | null;
  isOwner: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q);
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  // Every filter is a URL parameter so the server does the searching. Paging
  // resets on any change of criteria, otherwise a narrowed search lands the
  // admin on a page that no longer exists.
  function applyParams(next: Partial<{ q: string; status: string; type: string; page: number }>) {
    const params = new URLSearchParams();
    const q = next.q ?? filters.q;
    const status = next.status ?? filters.status;
    const type = next.type ?? filters.type;
    const page = next.page ?? 1;

    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("type", type);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    startTransition(() => router.push(query ? `/adpnl/coupons?${query}` : "/adpnl/coupons"));
  }

  // Debounced so typing a code does not fire a query per keystroke.
  useEffect(() => {
    if (search === filters.q) return;
    const timer = setTimeout(() => applyParams({ q: search }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleToggleActive(couponId: string) {
    if (!canManage) return;
    setBusyId(couponId);
    setActionError(null);
    try {
      // The action reports refusals in its return value rather than throwing,
      // so a failed toggle used to look exactly like a successful one.
      const res = await toggleCouponActiveAction(couponId);
      if (!res.success) {
        setActionError(res.error || "Couldn't change that coupon's status.");
        return;
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setActionError("Couldn't change that coupon's status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Coupons &amp; Promotions</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-[#c0282b] rounded-full">
              {metrics.totalCoupons} total
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage custom promotional codes, bulk influencer campaigns, and redemption limits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link
            href="/adpnl/coupons/usage"
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-2 px-3 py-2 border border-gray-300 hover:border-gray-400 bg-white text-gray-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            <History className="w-4 h-4 text-gray-500" />
            <span>Usage History</span>
          </Link>

          <button
            type="button"
            onClick={() => setGenerateOpen(true)}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Random</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* Total Coupons */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Total Coupons
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-gray-900">{metrics.totalCoupons}</span>
            <span className="text-[11px] sm:text-xs text-gray-400 font-medium">{metrics.activeCoupons} active</span>
          </div>
        </div>

        {/* Active Coupons */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Active Now
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">{metrics.activeCoupons}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        {/* Total Redemptions */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Total Uses
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-blue-600">{metrics.totalRedemptions}</span>
            <ShoppingBag className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        {/* Total Discount Given */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Discount Given
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-extrabold text-purple-700 font-display">
              {formatPrice(metrics.totalDiscountGivenCents)}
            </span>
            <TrendingDown className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        {/* Most Used */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Most Used
          </span>
          <div className="mt-1.5 sm:mt-2">
            {metrics.mostUsedCoupon ? (
              <div>
                <span className="font-mono text-xs sm:text-sm font-bold text-gray-900 truncate block">
                  {metrics.mostUsedCoupon.code}
                </span>
                <span className="text-[10px] sm:text-[11px] text-gray-500">
                  {metrics.mostUsedCoupon.usageCount} uses
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">None yet</span>
            )}
          </div>
        </div>

        {/* Near Limit */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Near Limit
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <span className={`text-xl sm:text-2xl font-extrabold ${metrics.nearLimitCount > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {metrics.nearLimitCount}
            </span>
            <AlertTriangle className={`w-4 h-4 ${metrics.nearLimitCount > 0 ? "text-amber-500" : "text-gray-300"}`} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search coupon code or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c0282b]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400 font-medium hidden sm:inline">Status:</span>
            <select
              value={filters.status}
              onChange={(e) => applyParams({ status: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="limit-reached">Limit Reached</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400 font-medium hidden sm:inline">Type:</span>
            <select
              value={filters.type}
              onChange={(e) => applyParams({ type: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{loadError}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Coupons Container */}
      <div className={`bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden ${pending ? "opacity-60" : ""}`}>
        {coupons.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-gray-400">
            <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-600">No coupons found</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {filters.q || filters.status !== "all" || filters.type !== "all"
                ? "Try adjusting your search criteria."
                : "Create your first coupon to get started."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (below md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {coupons.map((coupon) => {
                const isLimitReached = coupon.status === "Limit Reached";
                const isInactive = coupon.status === "Inactive";

                return (
                  <div key={coupon.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/adpnl/coupons/${coupon.id}`}
                            className="font-mono font-bold text-sm text-gray-900 hover:text-[#c0282b]"
                          >
                            {coupon.code}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded"
                            title="Copy code"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.note && (
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                            {coupon.note}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {isInactive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                            Inactive
                          </span>
                        ) : isLimitReached ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Limit Reached
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                      <div>
                        <span className="font-bold text-gray-900 text-sm">
                          {formatDiscountValue(coupon.discountType, coupon.discountValue)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {coupon.discountType === "PERCENTAGE" ? "Percentage off" : "Fixed discount"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-700 font-medium">
                          {coupon.minimumOrderAmountCents
                            ? `Min: ${formatPrice(coupon.minimumOrderAmountCents)}`
                            : "No min order"}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {coupon.usageLimit !== null
                            ? `${coupon.usageCount} / ${coupon.usageLimit} used`
                            : `${coupon.usageCount} uses (unlimited)`}
                        </span>
                      </div>
                    </div>

                    {coupon.usageLimit !== null && (
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isLimitReached
                              ? "bg-amber-500"
                              : coupon.usageCount / coupon.usageLimit >= 0.8
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (coupon.usageCount / coupon.usageLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">
                        {new Date(coupon.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(coupon.id)}
                            disabled={busyId === coupon.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                              coupon.isActive
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            <span>{coupon.isActive ? "Deactivate" : "Activate"}</span>
                          </button>
                        )}
                        <Link
                          href={`/adpnl/coupons/${coupon.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-md transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3">Coupon Code</th>
                    <th className="px-5 py-3">Discount</th>
                    <th className="px-5 py-3">Min Order</th>
                    <th className="px-5 py-3">Usage / Limit</th>
                    <th className="px-5 py-3">Remaining</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coupons.map((coupon) => {
                    const isLimitReached = coupon.status === "Limit Reached";
                    const isInactive = coupon.status === "Inactive";

                    return (
                      <tr key={coupon.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Code */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/adpnl/coupons/${coupon.id}`}
                              className="font-mono font-bold text-xs text-gray-900 hover:text-[#c0282b] transition-colors"
                            >
                              {coupon.code}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopy(coupon.code)}
                              className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                              title="Copy code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {coupon.note && (
                            <p className="text-[11px] text-gray-400 truncate max-w-[200px] mt-0.5">
                              {coupon.note}
                            </p>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-gray-900">
                            {formatDiscountValue(coupon.discountType, coupon.discountValue)}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {coupon.discountType === "PERCENTAGE" ? "Percentage off" : "Fixed discount"}
                          </span>
                        </td>

                        {/* Min Order */}
                        <td className="px-5 py-3.5 font-medium text-gray-700">
                          {coupon.minimumOrderAmountCents
                            ? formatPrice(coupon.minimumOrderAmountCents)
                            : "None"}
                        </td>

                        {/* Usage */}
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-gray-900">
                            {coupon.usageCount} /{" "}
                            {coupon.usageLimit !== null ? coupon.usageLimit : "Unlimited"}
                          </span>
                          {coupon.usageLimit !== null && (
                            <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isLimitReached
                                    ? "bg-amber-500"
                                    : coupon.usageCount / coupon.usageLimit >= 0.8
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${Math.min(100, (coupon.usageCount / coupon.usageLimit) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Remaining Uses */}
                        <td className="px-5 py-3.5">
                          {coupon.usageLimit !== null ? (
                            <span
                              className={`font-semibold ${
                                coupon.remainingUses === 0
                                  ? "text-amber-600"
                                  : coupon.remainingUses && coupon.remainingUses <= 5
                                  ? "text-amber-600"
                                  : "text-gray-700"
                              }`}
                            >
                              {coupon.remainingUses} remaining
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">Unlimited</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {isInactive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          ) : isLimitReached ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Limit Reached
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-5 py-3.5 text-gray-500 text-[11px]">
                          {new Date(coupon.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/adpnl/coupons/${coupon.id}`}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                              title="View details & redemptions"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(coupon.id)}
                                disabled={busyId === coupon.id}
                                className={`p-1.5 rounded-md transition-colors ${
                                  coupon.isActive
                                    ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                }`}
                                title={coupon.isActive ? "Deactivate coupon" : "Activate coupon"}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
              <span className="text-xs text-gray-500">
                Showing <strong className="text-gray-700">{firstRow}–{lastRow}</strong> of{" "}
                <strong className="text-gray-700">{total}</strong> coupon{total === 1 ? "" : "s"}
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
          </>
        )}
      </div>

      {/* Creation Dialogs */}
      <CreateCouponDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        isOwner={isOwner}
      />

      <GenerateRandomCouponsDialog
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        isOwner={isOwner}
      />
    </div>
  );
}
