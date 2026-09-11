"use client";

import { useState } from "react";
import SkeletonImage from "@/components/SkeletonImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Check,
  Loader2,
  AlertTriangle,
  PackageSearch,
} from "lucide-react";
import {
  reorderCategoryProductsAction,
  reorderFeaturedProductsAction,
} from "@/lib/actions/product";
import { formatPrice } from "@/lib/format";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";

// Position is decided by dragging a product, not by typing a number into its
// edit form. Same two rules the category manager follows:
//
//  - The list moves in local state first and saves after. A drag that waits
//    for a round trip before it moves feels broken.
//  - Up/down buttons do the same job, because HTML5 drag events don't fire on
//    touch at all and this admin gets used on a phone.

export type ArrangeRow = {
  id: string;
  name: string;
  sku: string;
  image: string;
  priceCents: number;
  salePercent?: number | null;
  compareAtPriceCents?: number;
  soldOut?: boolean;
  stockQty?: number;
  inStock?: boolean;
};

export type ArrangeScope = { key: string; label: string; count: number };

function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function ProductArrangeClient({
  products,
  scopes,
  activeScope,
}: {
  products: ArrangeRow[];
  scopes: ArrangeScope[];
  activeScope: string;
}) {
  const router = useRouter();

  // Re-synced by comparing the prop against the last one seen during render:
  // an effect calling setItems would fire on every render, since the server
  // hands down a fresh array each time.
  const [items, setItems] = useState<ArrangeRow[]>(products);
  const [seen, setSeen] = useState(products);
  if (seen !== products) {
    setSeen(products);
    setItems(products);
  }

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFeatured = activeScope === "featured";

  async function persist(next: ArrangeRow[]) {
    setItems(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const ids = next.map((p) => p.id);
      const res = isFeatured
        ? await reorderFeaturedProductsAction(ids)
        : await reorderCategoryProductsAction(ids);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      } else {
        setError(res.error || "Couldn't save that order.");
        setItems(products); // put the list back where the server has it
      }
    } catch {
      setError("Couldn't save that order.");
      setItems(products);
    } finally {
      setSaving(false);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    persist(reorder(items, from, to));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/adpnl/products"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Arrange Products
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Drag a product, or use the arrows, to set the order customers see.
              Saves as you go.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {saving && (
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saved && !saving && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
              <Check className="w-3.5 h-3.5" />
              Order saved
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Which list is being arranged. Featured is a separate axis from any
          category, so it sits in the same picker rather than a second page. */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5">
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Arranging
        </label>
        <select
          value={activeScope}
          onChange={(e) => router.push(`/adpnl/products/arrange?scope=${e.target.value}`)}
          className="w-full sm:w-80 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#c0282b]"
        >
          {scopes.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <PackageSearch className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-600">Nothing to arrange here</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isFeatured
                ? "Mark a product as Featured on Homepage to add it to this list."
                : "This category has no products yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((p, index) => {
              const pricing = resolvePricing(p);
              const availability = resolveAvailability(p);
              const isDragging = dragId === p.id;
              const isOver = overId === p.id && dragId !== p.id;

              return (
                <li
                  key={p.id}
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverId(p.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = items.findIndex((x) => x.id === dragId);
                    if (from !== -1) move(from, index);
                    setDragId(null);
                    setOverId(null);
                  }}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors ${
                    isDragging ? "opacity-40" : ""
                  } ${isOver ? "bg-red-50/60" : "hover:bg-gray-50/70"}`}
                >
                  <span className="w-7 text-center text-xs font-bold text-gray-400 shrink-0">
                    {index + 1}
                  </span>

                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0 cursor-grab hidden sm:block" />

                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <SkeletonImage src={p.image} alt={p.name} fill sizes="44px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-400">
                      <span className="font-mono">{p.sku}</span>
                      <span className="text-gray-700 font-semibold">
                        {formatPrice(pricing.effectiveCents)}
                      </span>
                      {pricing.onSale && (
                        <span className="font-bold text-[#c0282b]">
                          {pricing.percentOff}% off
                        </span>
                      )}
                      {!availability.purchasable && (
                        <span className="font-bold uppercase tracking-wide text-gray-500">
                          {availability.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0 || saving}
                      aria-label={`Move ${p.name} up`}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, index + 1)}
                      disabled={index === items.length - 1 || saving}
                      aria-label={`Move ${p.name} down`}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        {isFeatured
          ? "This is the order of the featured rail on the homepage. It is independent of where each product sits in its category."
          : "This is the order customers see on the category page. A product's featured position is arranged separately."}
      </p>
    </div>
  );
}
