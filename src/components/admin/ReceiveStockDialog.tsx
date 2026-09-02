"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, AlertCircle, Search, PackagePlus } from "lucide-react";
import { receiveStockAction } from "@/lib/actions/inventory";
import { InventoryRow } from "@/lib/inventory-shared";

// A delivery arrives as one event covering many products, so this takes the
// whole shipment in one pass instead of making the owner open a dialog per
// product. Each line still becomes its own RESTOCK movement.
export default function ReceiveStockDialog({
  rows,
  onClose,
  onSaved,
}: {
  rows: InventoryRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const lines = useMemo(
    () =>
      Object.entries(qtys)
        .map(([productId, raw]) => ({
          productId,
          qty: Math.trunc(Number(raw)),
        }))
        .filter((l) => Number.isFinite(l.qty) && l.qty > 0),
    [qtys],
  );

  const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await receiveStockAction(lines, note);
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || "Failed to receive stock");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-accent" />
              <span>Receive stock</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter how many units arrived. Blank lines are ignored.
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

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, SKU or brand"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-gray-100">
            {filtered.length === 0 && (
              <p className="text-xs text-gray-500 py-8 text-center">
                No products match “{query}”.
              </p>
            )}
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {r.name}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono truncate">
                    {r.sku} · {r.stockQty} in stock
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={qtys[r.id] ?? ""}
                  onChange={(e) =>
                    setQtys((q) => ({ ...q, [r.id]: e.target.value }))
                  }
                  placeholder="0"
                  className="w-20 shrink-0 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:border-[#c0282b]"
                />
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 space-y-3 shrink-0">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the whole delivery (optional) — e.g. invoice #4471"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {lines.length === 0 ? (
                  "Nothing entered yet"
                ) : (
                  <>
                    <strong className="text-gray-900">{totalUnits}</strong> units
                    across <strong className="text-gray-900">{lines.length}</strong>{" "}
                    {lines.length === 1 ? "product" : "products"}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || lines.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Add to stock</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
