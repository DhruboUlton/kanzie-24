"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { adjustStockAction } from "@/lib/actions/inventory";
import {
  InventoryRow,
  REASON_LABELS,
  STOCK_REASONS,
  StockReason,
} from "@/lib/inventory-shared";

// Two ways to change a count, because they answer different questions:
// "12 more arrived" (add) and "I counted the shelf, there are 9" (set).
// Recording which one was used keeps the history readable later.
type Mode = "delta" | "set";

export default function StockAdjustDialog({
  row,
  onClose,
  onSaved,
}: {
  row: InventoryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<Mode>("delta");
  const [amount, setAmount] = useState<string>("1");
  const [reason, setReason] = useState<StockReason>("RESTOCK");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Switching mode changes what the number means, so seed it with a
  // sensible starting value instead of carrying the old one over.
  const switchMode = (next: Mode) => {
    setMode(next);
    setAmount(next === "set" ? String(row.stockQty) : "1");
    setReason(next === "set" ? "CORRECTION" : "RESTOCK");
  };

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && amount.trim() !== "";
  const preview = !valid
    ? null
    : mode === "set"
      ? Math.trunc(parsed)
      : row.stockQty + Math.trunc(parsed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await adjustStockAction({
        productId: row.id,
        mode,
        value: Math.trunc(parsed),
        reason,
        note,
      });
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || "Failed to adjust stock");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">
              Adjust stock
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {row.name} · {row.sku}
            </p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-xs font-semibold text-gray-600">
              Currently in stock
            </span>
            <span className="text-lg font-bold text-gray-900">
              {row.stockQty}
            </span>
          </div>

          <div className="inline-flex p-1 bg-gray-100 rounded-lg">
            {(
              [
                ["delta", "Add / remove"],
                ["set", "Set exact count"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  mode === value
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {mode === "delta"
                ? "How many? (use a minus sign to remove)"
                : "New counted total"}
            </label>
            <div className="flex items-center gap-2">
              {mode === "delta" && (
                <button
                  type="button"
                  onClick={() =>
                    setAmount(String((Math.trunc(Number(amount)) || 0) - 1))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  −
                </button>
              )}
              <input
                type="number"
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className={`${inputClass} text-center font-bold`}
              />
              {mode === "delta" && (
                <button
                  type="button"
                  onClick={() =>
                    setAmount(String((Math.trunc(Number(amount)) || 0) + 1))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  +
                </button>
              )}
            </div>
            {preview !== null && (
              <p
                className={`text-xs mt-1.5 font-semibold ${
                  preview < 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                New stock level: {preview}
                {preview < 0 && " — that would go below zero"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StockReason)}
              className={inputClass}
            >
              {STOCK_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REASON_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Saved with the change so you can see later why the count moved.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. supplier delivery, invoice #221"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !valid}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
