"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Search, Check, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { ComboEligibleProduct } from "@/lib/combos-shared";

export default function ProductSlotPickerModal({
  isOpen,
  onClose,
  products,
  onSelect,
  slotIndex,
  currentlySelectedIds,
  allowSameProduct,
}: {
  isOpen: boolean;
  onClose: () => void;
  products: ComboEligibleProduct[];
  onSelect: (product: ComboEligibleProduct) => void;
  slotIndex: number;
  currentlySelectedIds: string[];
  allowSameProduct: boolean;
}) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <div>
            <h3 className="font-display text-lg tracking-wide text-black">
              SELECT ITEM #{slotIndex + 1}
            </h3>
            <p className="text-xs text-black/60">
              Pick any eligible product for this combo offer
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-black/50 hover:text-black hover:bg-black/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-black/5 bg-paper/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
            <input
              type="text"
              placeholder="Search by product name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-white border border-black/15 rounded-lg text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-black/5 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-black/50">
              No matching products found.
            </div>
          ) : (
            filtered.map((p) => {
              const isAlreadySelected =
                !allowSameProduct && currentlySelectedIds.includes(p.id);
              // A sold-out product used to be pickable here and only failed at
              // checkout, on a bundle the customer had already finished
              // building. The server still rejects it; this stops it being
              // offered in the first place.
              const isOutOfStock = !p.inStock;
              const isDisabled = isOutOfStock || isAlreadySelected;

              return (
                <div
                  key={p.id}
                  className={`pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl transition-all ${
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-paper/80 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isDisabled) {
                      onSelect(p);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-lg bg-paper border border-black/10 overflow-hidden relative shrink-0">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-black line-clamp-1 leading-snug">
                          {p.name}
                        </h4>
                        {isOutOfStock && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-bold uppercase tracking-wide rounded">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-black/60">
                        <span className="font-mono font-medium text-black">
                          {formatPrice(p.effectivePriceCents)}
                        </span>
                        <span>&middot;</span>
                        <span>SKU: {p.sku}</span>
                      </div>
                      {isOutOfStock ? (
                        <p className="text-[11px] text-black/50 font-medium">
                          Currently unavailable
                        </p>
                      ) : (
                        isAlreadySelected && (
                          <p className="text-[11px] text-amber-600 font-medium">
                            Already selected in another slot
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isDisabled}
                    className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-200 text-white disabled:text-neutral-500 text-xs font-bold rounded-full shrink-0 transition-colors"
                  >
                    {isOutOfStock ? "Sold out" : "Select"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
