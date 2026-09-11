"use client";

import { useMemo, useState } from "react";
import SkeletonImage from "@/components/SkeletonImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Coins,
  Search,
  PackagePlus,
  Download,
  History,
  SlidersHorizontal,
  TriangleAlert,
  Loader2,
  CheckCircle2,
  Minus,
  Plus,
  ClipboardList,
} from "lucide-react";
import StockAdjustDialog from "@/components/admin/StockAdjustDialog";
import ReceiveStockDialog from "@/components/admin/ReceiveStockDialog";
import ProductInventoryDrawer from "@/components/admin/ProductInventoryDrawer";
import { adjustStockAction, updateLowStockThresholdAction } from "@/lib/actions/inventory";
import {
  InventoryRow,
  InventorySummary,
  REASON_SHORT,
  STATUS_LABELS,
  StockMovementRow,
  StockStatus,
} from "@/lib/inventory-shared";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/datetime";

const STATUS_STYLE: Record<StockStatus, string> = {
  OVERSOLD: "bg-red-100 text-red-700 border-red-200",
  OUT: "bg-gray-200 text-gray-700 border-gray-300",
  LOW: "bg-amber-100 text-amber-800 border-amber-200",
  OK: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// Worst first — the table's whole job is surfacing what needs action today.
const STATUS_RANK: Record<StockStatus, number> = {
  OVERSOLD: 0,
  OUT: 1,
  LOW: 2,
  OK: 3,
};

type Filter = "ALL" | StockStatus;

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function InventoryClient({
  rows,
  summary,
  threshold,
  movements,
}: {
  rows: InventoryRow[];
  summary: InventorySummary;
  threshold: number;
  movements: StockMovementRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [category, setCategory] = useState("ALL");

  // Dialogs track a product id, not a row snapshot: a save triggers
  // router.refresh(), and looking the row up again means the open dialog
  // shows the value that was just written instead of the stale one.
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Which row is mid-save from the inline +/- buttons.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [thresholdInput, setThresholdInput] = useState(String(threshold));
  const [savingThreshold, setSavingThreshold] = useState(false);

  const adjusting = useMemo(
    () => rows.find((r) => r.id === adjustingId) ?? null,
    [rows, adjustingId],
  );
  const drawerRow = useMemo(
    () => rows.find((r) => r.id === drawerId) ?? null,
    [rows, drawerId],
  );

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.categoryName))).sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter !== "ALL" && r.status !== filter) return false;
        if (category !== "ALL" && r.categoryName !== category) return false;
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          a.stockQty - b.stockQty ||
          a.name.localeCompare(b.name),
      );
  }, [rows, query, filter, category]);

  async function quickAdjust(row: InventoryRow, delta: number) {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await adjustStockAction({
        productId: row.id,
        mode: "delta",
        value: delta,
        reason: delta > 0 ? "RESTOCK" : "CORRECTION",
        note: "Quick adjustment from the inventory list",
      });
      if (res.success) {
        setFlash(row.id);
        setTimeout(() => setFlash(null), 1200);
        router.refresh();
      } else {
        setError(res.error || "Failed to adjust stock");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setBusyId(null);
    }
  }

  async function saveThreshold() {
    setSavingThreshold(true);
    setError(null);
    try {
      const res = await updateLowStockThresholdAction(Number(thresholdInput));
      if (res.success) router.refresh();
      else setError(res.error || "Failed to save threshold");
    } finally {
      setSavingThreshold(false);
    }
  }

  function exportCsv() {
    const header = [
      "SKU",
      "Product",
      "Brand",
      "Category",
      "In stock",
      "Committed",
      "Available",
      "Low-stock alert",
      "Status",
      "Selling price",
      "Cost price",
      "Stock value at cost",
    ];
    const lines = visible.map((r) =>
      [
        r.sku,
        r.name,
        r.brand,
        r.categoryName,
        r.stockQty,
        r.committed,
        r.available,
        r.threshold,
        STATUS_LABELS[r.status],
        (r.priceCents / 100).toFixed(2),
        r.costPriceCents != null ? (r.costPriceCents / 100).toFixed(2) : "",
        r.costPriceCents != null
          ? ((Math.max(0, r.stockQty) * r.costPriceCents) / 100).toFixed(2)
          : "",
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanzie-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const alertChips: { id: Filter; label: string; count: number; tone: string }[] = [
    {
      id: "OVERSOLD",
      label: "Oversold",
      count: summary.oversoldCount,
      tone: "text-red-700 bg-red-50 border-red-200",
    },
    {
      id: "OUT",
      label: "Out of stock",
      count: summary.outCount,
      tone: "text-gray-700 bg-gray-100 border-gray-300",
    },
    {
      id: "LOW",
      label: "Running low",
      count: summary.lowCount,
      tone: "text-amber-800 bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            What&apos;s on the shelf, what&apos;s promised, and what needs
            reordering
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={exportCsv}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setReceiving(true)}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Receive stock</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <TriangleAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <Boxes className="w-4 h-4" />
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide">
              Units on hand
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            {summary.unitCount}
          </p>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
            across {summary.skuCount} products
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <ClipboardList className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              Promised
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.committedUnits}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            in orders awaiting your call
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <Coins className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              Retail value
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatPrice(summary.retailValueCents)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            if everything sells at list price
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <Coins className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              Value at cost
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.costKnownCount === 0
              ? "—"
              : formatPrice(summary.costValueCents)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {summary.costKnownCount === 0
              ? "add cost prices to see this"
              : `cost known for ${summary.costKnownCount} of ${summary.skuCount}`}
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {alertChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              setTab("stock");
              setFilter(filter === chip.id ? "ALL" : chip.id);
            }}
            disabled={chip.count === 0}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all disabled:opacity-40 ${chip.tone} ${
              filter === chip.id ? "ring-2 ring-offset-1 ring-gray-400" : ""
            }`}
          >
            <span>{chip.label}</span>
            <span className="font-bold">{chip.count}</span>
          </button>
        ))}
        {filter !== "ALL" && (
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-gray-100 rounded-lg">
        {(
          [
            ["stock", "Stock levels", Boxes],
            ["history", "Movement history", History],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === id
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === "stock" ? (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, SKU or brand"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
            >
              <option value="ALL">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-center">In stock</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">
                      Promised
                    </th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">
                      Available
                    </th>
                    <th className="px-4 py-3 hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-xs text-gray-500"
                      >
                        No products match these filters.
                      </td>
                    </tr>
                  )}

                  {visible.map((r) => (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        flash === r.id ? "bg-emerald-50" : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-md bg-gray-100 overflow-hidden shrink-0">
                            {r.image && (
                              <SkeletonImage
                                src={r.image}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[9rem] sm:max-w-[13rem]">
                              {r.name}
                            </p>
                            <p className="text-[11px] text-gray-500 font-mono truncate">
                              {r.sku} · {r.categoryName}
                            </p>
                            <span
                              className={`sm:hidden inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[r.status]}`}
                            >
                              {STATUS_LABELS[r.status]}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => quickAdjust(r, -1)}
                            disabled={busyId === r.id || r.stockQty <= 0}
                            aria-label={`Remove one ${r.name}`}
                            className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center font-bold text-gray-900 tabular-nums">
                            {busyId === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" />
                            ) : (
                              r.stockQty
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => quickAdjust(r, 1)}
                            disabled={busyId === r.id}
                            aria-label={`Add one ${r.name}`}
                            className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center hidden sm:table-cell tabular-nums text-gray-600">
                        {r.committed || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-center hidden sm:table-cell tabular-nums font-semibold ${
                          r.available < 0 ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {r.available}
                      </td>

                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold ${STATUS_STYLE[r.status]}`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setAdjustingId(r.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrawerId(r.id)}
                            title="Cost, alert level and history"
                            aria-label={`Inventory details for ${r.name}`}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Store-wide threshold */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Low-stock alert
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 mb-3">
              Products at or below this number are flagged as running low.
              Individual products can override it from their details panel.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:border-[#c0282b]"
              />
              <button
                type="button"
                onClick={saveThreshold}
                disabled={savingThreshold || thresholdInput === String(threshold)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors"
              >
                {savingThreshold ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : thresholdInput === String(threshold) ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : null}
                <span>
                  {thresholdInput === String(threshold) ? "Saved" : "Save"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Movement history */
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {movements.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-gray-500">
              Nothing recorded yet. Every stock change from now on lands here —
              adjustments you make, and sales when you confirm an order.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-center">Change</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">
                      After
                    </th>
                    <th className="px-4 py-3 hidden lg:table-cell">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 truncate max-w-[14rem]">
                          {m.productName}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono">
                          {m.productSku}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-gray-700">
                          {REASON_SHORT[m.reason]}
                        </span>
                        {m.orderId && (
                          <Link
                            href={`/adpnl/orders/${m.orderId}`}
                            className="block text-[11px] text-accent hover:underline"
                          >
                            View order
                          </Link>
                        )}
                        {m.note && !m.orderId && (
                          <p className="text-[11px] text-gray-400 italic truncate max-w-[16rem]">
                            {m.note}
                          </p>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-bold tabular-nums ${
                          m.delta > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {m.delta > 0 ? "+" : ""}
                        {m.delta}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell tabular-nums text-gray-700">
                        {m.resultQty}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 truncate max-w-[10rem]">
                        {m.actorName || "System"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {adjusting && (
        <StockAdjustDialog
          row={adjusting}
          onClose={() => setAdjustingId(null)}
          onSaved={() => {
            setAdjustingId(null);
            router.refresh();
          }}
        />
      )}

      {receiving && (
        <ReceiveStockDialog
          rows={rows}
          onClose={() => setReceiving(false)}
          onSaved={() => {
            setReceiving(false);
            router.refresh();
          }}
        />
      )}

      {drawerRow && (
        <ProductInventoryDrawer
          row={drawerRow}
          storeThreshold={threshold}
          onClose={() => setDrawerId(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
