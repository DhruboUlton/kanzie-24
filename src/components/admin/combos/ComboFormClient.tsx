"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Flame,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { createComboAction, updateComboAction } from "@/lib/actions/combos";

type ProductCandidate = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  priceCents: number;
  images: unknown;
  inStock: boolean;
  stockQty: number | null;
  category: { id: string; name: string };
};

type InitialCombo = {
  id: string;
  name: string;
  headline: string;
  subtext: string | null;
  allowSameProduct: boolean;
  isActive: boolean;
  priority: number;
  tiers: {
    id?: string;
    quantity: number;
    discountPercent: number;
    label: string;
    badgeText: string;
    subtext: string | null;
    isPopular: boolean;
    sortOrder: number;
  }[];
  products: {
    productId: string;
  }[];
};

type TierRow = {
  id?: string;
  quantity: number;
  discountPercent: number;
  label: string;
  badgeText: string;
  subtext: string;
  isPopular: boolean;
};

export default function ComboFormClient({
  initialData,
  products,
}: {
  initialData?: InitialCombo | null;
  products: ProductCandidate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(initialData?.id);

  // Form states
  const [name, setName] = useState(initialData?.name ?? "");
  const [headline, setHeadline] = useState(initialData?.headline ?? "BUY MORE GET MORE 🔥");
  const [subtext, setSubtext] = useState(initialData?.subtext ?? "");
  const [allowSameProduct, setAllowSameProduct] = useState(initialData?.allowSameProduct ?? true);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [priority, setPriority] = useState(initialData?.priority ?? 0);

  // Tiers state
  const [tiers, setTiers] = useState<TierRow[]>(
    initialData?.tiers?.length
      ? initialData.tiers.map((t) => ({
          id: t.id,
          quantity: t.quantity,
          discountPercent: t.discountPercent,
          label: t.label,
          badgeText: t.badgeText,
          subtext: t.subtext ?? "",
          isPopular: t.isPopular,
        }))
      : [
          {
            quantity: 2,
            discountPercent: 20,
            label: "BUY 2 CAPS",
            badgeText: "GET 20% OFF!",
            subtext: "Choose Any 2 caps here 👇",
            isPopular: false,
          },
          {
            quantity: 3,
            discountPercent: 30,
            label: "BUY 3 CAPS",
            badgeText: "GET 30% OFF!",
            subtext: "Choose Any 3 caps here 👇",
            isPopular: true,
          },
        ],
  );

  // Selected products state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(initialData?.products?.map((p) => p.productId) ?? []),
  );

  // Product selector filter states
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  // Unique categories for filter
  const categories = Array.from(
    new Map(products.map((p) => [p.category.id, p.category.name])).entries(),
  );

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCat =
      selectedCategory === "all" || p.category.id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredProducts) next.add(p.id);
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredProducts) next.delete(p.id);
      return next;
    });
  }

  function addTier() {
    const lastTier = tiers[tiers.length - 1];
    const nextQty = (lastTier?.quantity ?? 1) + 1;
    const nextDiscount = Math.min(100, (lastTier?.discountPercent ?? 15) + 10);
    setTiers([
      ...tiers,
      {
        quantity: nextQty,
        discountPercent: nextDiscount,
        label: `BUY ${nextQty} CAPS`,
        badgeText: `GET ${nextDiscount}% OFF!`,
        subtext: `Choose Any ${nextQty} caps here 👇`,
        isPopular: false,
      },
    ]);
  }

  function updateTier(index: number, patch: Partial<TierRow>) {
    setTiers((prev) =>
      prev.map((t, idx) => {
        if (idx !== index) return t;
        const updated = { ...t, ...patch };
        // If isPopular turned on, turn it off on other tiers
        if (patch.isPopular === true) {
          // Handled below
        }
        return updated;
      }),
    );

    if (patch.isPopular === true) {
      setTiers((prev) =>
        prev.map((t, idx) => ({
          ...t,
          isPopular: idx === index,
        })),
      );
    }
  }

  function removeTier(index: number) {
    if (tiers.length <= 1) {
      alert("A combo promotion must have at least one discount tier.");
      return;
    }
    setTiers((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a name for the combo promotion.");
      return;
    }

    if (selectedProductIds.size === 0) {
      setError("Please select at least one eligible product for this combo.");
      return;
    }

    if (tiers.length === 0) {
      setError("Please configure at least one discount tier.");
      return;
    }

    const payload = {
      name: name.trim(),
      headline: headline.trim(),
      subtext: subtext.trim() || null,
      allowSameProduct,
      isActive,
      priority: Number(priority) || 0,
      productIds: Array.from(selectedProductIds),
      tiers: tiers.map((t, idx) => ({
        quantity: Number(t.quantity),
        discountPercent: Number(t.discountPercent),
        label: t.label.trim(),
        badgeText: t.badgeText.trim(),
        subtext: t.subtext?.trim() || null,
        isPopular: Boolean(t.isPopular),
        sortOrder: idx,
      })),
    };

    startTransition(async () => {
      const res = isEditing
        ? await updateComboAction(initialData!.id, payload)
        : await createComboAction(payload);

      if (!res.success) {
        setError(res.error || "Failed to save combo offer.");
      } else {
        router.push("/adpnl/combos");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top navigation & action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <Link
            href="/adpnl/combos"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Combos</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? `Edit Combo: ${initialData?.name}` : "Create New Combo Offer"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/adpnl/combos"
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isEditing ? "Save Changes" : "Create Combo"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Basic Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
          <span>General Settings</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Internal Combo Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cap Collection Buy More Offer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used in admin reports and tracking.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Promotional Headline (Storefront) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="BUY MORE GET MORE 🔥"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Rendered above the combo cards on the product page.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Optional Subtext
            </label>
            <input
              type="text"
              placeholder="e.g. Mix and match any eligible items and save"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowSameProduct}
                onChange={(e) => setAllowSameProduct(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  Allow Same Product Multiple Times
                </span>
                <p className="text-xs text-gray-500">
                  If enabled, customer can pick 2 or 3 of the exact same product in the combo. If disabled, every item must be distinct.
                </p>
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  Enable Combo Promotion
                </span>
                <p className="text-xs text-gray-500">
                  Turn off to temporarily hide this combo without deleting its configuration.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Section 2: Discount Tiers */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Quantity-Based Discount Tiers</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure each tier (e.g. Buy 2 &rarr; 20% OFF, Buy 3 &rarr; 30% OFF).
            </p>
          </div>
          <button
            type="button"
            onClick={addTier}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tier</span>
          </button>
        </div>

        <div className="space-y-4">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                tier.isPopular
                  ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/50"
                  : "bg-gray-50/70 border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">
                    Tier {idx + 1}: Buy {tier.quantity} Items ({tier.discountPercent}% OFF)
                  </span>
                  {tier.isPopular && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Most Popular</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                  title="Remove tier"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quantity Required
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={tier.quantity}
                    onChange={(e) => updateTier(idx, { quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={tier.discountPercent}
                      onChange={(e) => updateTier(idx, { discountPercent: Number(e.target.value) })}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Title Label
                  </label>
                  <input
                    type="text"
                    value={tier.label}
                    onChange={(e) => updateTier(idx, { label: e.target.value })}
                    placeholder="e.g. BUY 2 CAPS"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Red Pill Badge
                  </label>
                  <input
                    type="text"
                    value={tier.badgeText}
                    onChange={(e) => updateTier(idx, { badgeText: e.target.value })}
                    placeholder="e.g. GET 20% OFF!"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subtext
                  </label>
                  <input
                    type="text"
                    value={tier.subtext}
                    onChange={(e) => updateTier(idx, { subtext: e.target.value })}
                    placeholder="e.g. Choose Any 2 caps here 👇"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tier.isPopular}
                      onChange={(e) => updateTier(idx, { isPopular: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Mark as &quot;Most Popular&quot;
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Eligible Products Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Eligible Products</h2>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                {selectedProductIds.size} Selected
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Select which products customers can mix and match to trigger this combo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Select All Filtered
            </button>
            <button
              type="button"
              onClick={deselectAllFiltered}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Deselect All Filtered
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by title or SKU…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map(([id, catName]) => (
              <option key={id} value={id}>
                {catName}
              </option>
            ))}
          </select>
        </div>

        {/* Product Grid / List */}
        <div className="border border-gray-200 rounded-xl overflow-y-auto max-h-96 divide-y divide-gray-100">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No products match your search filter.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isSelected = selectedProductIds.has(p.id);
              const images = Array.isArray(p.images) ? (p.images as string[]) : [];
              const image = images[0] || "/placeholder.jpg";

              return (
                <div
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`flex items-center gap-4 p-3.5 hover:bg-gray-50/75 cursor-pointer transition-colors ${
                    isSelected ? "bg-amber-50/30" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by container click
                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                  />

                  <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0">
                    <Image
                      src={image}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>SKU: {p.sku}</span>
                      <span>&middot;</span>
                      <span>{p.category.name}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-semibold text-gray-900 text-sm">
                      {formatPrice(p.priceCents)}
                    </div>
                    <div className="text-xs">
                      {p.inStock ? (
                        <span className="text-emerald-600 font-medium">In Stock</span>
                      ) : (
                        <span className="text-red-500 font-medium">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <Link
          href="/adpnl/combos"
          className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{isEditing ? "Update Combo Offer" : "Publish Combo Offer"}</span>
        </button>
      </div>
    </form>
  );
}
