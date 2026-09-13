"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  Loader2,
  Tag,
  ShoppingBag,
} from "lucide-react";
import { toggleComboActiveAction, deleteComboAction } from "@/lib/actions/combos";

type ComboRow = {
  id: string;
  name: string;
  headline: string;
  subtext: string | null;
  allowSameProduct: boolean;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  tiers: {
    id: string;
    quantity: number;
    discountPercent: number;
    label: string;
    badgeText: string;
    isPopular: boolean;
  }[];
  _count: {
    products: number;
  };
};

export default function ComboDashboardClient({
  combos,
  total,
  filters,
  canManage,
}: {
  combos: ComboRow[];
  total: number;
  filters: { q: string; status: string };
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [status, setStatus] = useState(filters.status);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function applyFilters(newSearch: string, newStatus: string) {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("q", newSearch.trim());
    if (newStatus !== "all") params.set("status", newStatus);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/adpnl/combos?${query}` : "/adpnl/combos");
    });
  }

  async function handleToggle(id: string, current: boolean) {
    if (!canManage || togglingId) return;
    setTogglingId(id);
    await toggleComboActiveAction(id, !current);
    setTogglingId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!canManage || deletingId) return;
    if (!confirm(`Are you sure you want to delete combo "${name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    await deleteComboAction(id);
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Combo Promotions</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Create dynamic &quot;Buy More, Get More&quot; quantity discounts for product collections.
          </p>
        </div>

        {canManage && (
          <Link
            href="/adpnl/combos/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Combo Offer</span>
          </Link>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by combo name or headline…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              applyFilters(e.target.value, status);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              applyFilters(search, e.target.value);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table or Empty State */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {combos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No combo offers found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Get started by creating your first &quot;Buy 2 / Buy 3&quot; combo promotion. Assign eligible products and customize discount tiers.
            </p>
            {canManage && (
              <Link
                href="/adpnl/combos/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Combo</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 text-gray-900 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Combo Promotion</th>
                  <th className="px-5 py-3.5">Discount Tiers</th>
                  <th className="px-5 py-3.5">Eligible Products</th>
                  <th className="px-5 py-3.5">Duplicates</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {combos.map((combo) => (
                  <tr key={combo.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Title */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">{combo.name}</div>
                      <div className="text-xs text-amber-700 font-medium mt-0.5">
                        {combo.headline}
                      </div>
                      {combo.subtext && (
                        <div className="text-xs text-gray-400 mt-0.5">{combo.subtext}</div>
                      )}
                    </td>

                    {/* Tiers */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {combo.tiers.map((t) => (
                          <span
                            key={t.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                              t.isPopular
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            <span>Buy {t.quantity}</span>
                            <span className="text-red-600">({t.discountPercent}% OFF)</span>
                            {t.isPopular && <Sparkles className="w-3 h-3 text-amber-600" />}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Eligible Products */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        <span>{combo._count.products} products</span>
                      </div>
                    </td>

                    {/* Allow Duplicates */}
                    <td className="px-5 py-4">
                      {combo.allowSameProduct ? (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-medium">
                          Allowed
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200 font-medium">
                          Must be unique
                        </span>
                      )}
                    </td>

                    {/* Status toggle */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={!canManage || togglingId === combo.id}
                        onClick={() => handleToggle(combo.id, combo.isActive)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          combo.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                        } ${!canManage ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {togglingId === combo.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : combo.isActive ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-gray-400" />
                        )}
                        <span>{combo.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (
                          <>
                            <Link
                              href={`/adpnl/combos/${combo.id}`}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit Combo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              disabled={deletingId === combo.id}
                              onClick={() => handleDelete(combo.id, combo.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Combo"
                            >
                              {deletingId === combo.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
