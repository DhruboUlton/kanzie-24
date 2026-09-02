"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, History } from "lucide-react";
import {
  getProductMovementsAction,
  updateProductInventorySettingsAction,
} from "@/lib/actions/inventory";
import {
  InventoryRow,
  REASON_SHORT,
  StockMovementRow,
} from "@/lib/inventory-shared";
import { formatPrice } from "@/lib/format";

export default function ProductInventoryDrawer({
  row,
  storeThreshold,
  onClose,
  onSaved,
}: {
  row: InventoryRow;
  storeThreshold: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [costTaka, setCostTaka] = useState(
    row.costPriceCents != null ? String(row.costPriceCents / 100) : "",
  );
  const [threshold, setThreshold] = useState(
    row.threshold === storeThreshold ? "" : String(row.threshold),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [movements, setMovements] = useState<StockMovementRow[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    getProductMovementsAction(row.id)
      .then((m) => !cancelled && setMovements(m))
      .catch(() => !cancelled && setMovements([]));
    return () => {
      cancelled = true;
    };
  }, [row.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateProductInventorySettingsAction({
        productId: row.id,
        costTaka: costTaka.trim() === "" ? null : Number(costTaka),
        lowStockThreshold: threshold.trim() === "" ? null : Number(threshold),
      });
      if (res.success) {
        setSaved(true);
        onSaved();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.error || "Failed to save");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]";

  const margin =
    row.costPriceCents != null ? row.priceCents - row.costPriceCents : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-md h-full shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">
              {row.name}
            </h3>
            <p className="text-xs text-gray-500 font-mono truncate">{row.sku}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSave} className="p-5 space-y-4 border-b border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Inventory settings
            </h4>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}
            {saved && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Cost price per unit (৳)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costTaka}
                onChange={(e) => setCostTaka(e.target.value)}
                placeholder="What you paid for it"
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Only used inside the admin — powers the stock value totals and
                the margin below. Leave empty if you don&apos;t track it.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-gray-500">Selling price</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatPrice(row.priceCents)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-gray-500">Margin per unit</p>
                <p
                  className={`text-sm font-bold mt-0.5 ${
                    margin === null
                      ? "text-gray-400"
                      : margin < 0
                        ? "text-red-600"
                        : "text-emerald-600"
                  }`}
                >
                  {margin === null ? "—" : formatPrice(margin)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Low-stock alert at
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={`Store default (${storeThreshold})`}
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Leave empty to follow the store default. Set it higher for
                products that sell fast or take long to restock.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save settings</span>
            </button>
          </form>

          <div className="p-5 space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              <span>Stock history</span>
            </h4>

            {movements === null && (
              <p className="text-xs text-gray-400 flex items-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading…</span>
              </p>
            )}

            {movements?.length === 0 && (
              <p className="text-xs text-gray-500 py-4">
                No changes recorded yet. Every adjustment from here on is
                logged with who made it and why.
              </p>
            )}

            <div className="space-y-2">
              {movements?.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-gray-200 bg-gray-50/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      {REASON_SHORT[m.reason]}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        m.delta > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    → {m.resultQty} in stock ·{" "}
                    {new Date(m.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {m.note && (
                    <p className="text-[11px] text-gray-600 mt-1 italic">
                      “{m.note}”
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    by {m.actorName || "System"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
