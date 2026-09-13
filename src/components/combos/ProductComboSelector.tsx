"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Flame,
  Truck,
  Package,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Check,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCartStore, setBuyNowItem } from "@/lib/cart-store";
import { Product } from "@/lib/products";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";
import {
  StorefrontCombo,
  ComboTierSummary,
  ComboEligibleProduct,
  calculateComboPrice,
} from "@/lib/combos-shared";
import ProductSlotPickerModal from "@/components/combos/ProductSlotPickerModal";

export default function ProductComboSelector({
  product,
  combo,
}: {
  product: Product;
  combo: StorefrontCombo;
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const availability = resolveAvailability(product);
  const pricing = resolvePricing(product);

  // Convert current product to eligible product format
  const currentEligible: ComboEligibleProduct = useMemo(() => {
    const images = Array.isArray(product.images) ? (product.images as string[]) : [];
    return {
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      priceCents: product.priceCents,
      effectivePriceCents: pricing.effectiveCents,
      image: images[0] || "/placeholder.jpg",
      inStock: availability.purchasable,
      stockQty: product.stockQty ?? null,
      categoryName: product.category,
    };
  }, [product, pricing, availability]);

  // Available tiers sorted by quantity
  const tiers = combo.tiers;
  const firstTier = tiers[0];

  // Selected mode: "STANDARD" or tier.id
  // Default to first tier matching the screenshot
  const [selectedMode, setSelectedMode] = useState<string>(
    firstTier ? firstTier.id : "STANDARD",
  );

  // Slots for each tier: Record<tierId, (ComboEligibleProduct | null)[]>
  // Slot 0 is initialized with current product
  const [tierSlots, setTierSlots] = useState<
    Record<string, (ComboEligibleProduct | null)[]>
  >(() => {
    const initial: Record<string, (ComboEligibleProduct | null)[]> = {};
    for (const t of tiers) {
      const slots: (ComboEligibleProduct | null)[] = [currentEligible];
      for (let i = 1; i < t.quantity; i++) {
        slots.push(null);
      }
      initial[t.id] = slots;
    }
    return initial;
  });

  // Modal picker state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activePickingTierId, setActivePickingTierId] = useState<string | null>(null);
  const [activePickingSlotIdx, setActivePickingSlotIdx] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active tier object if combo is selected
  const activeTier = useMemo(
    () => tiers.find((t) => t.id === selectedMode),
    [tiers, selectedMode],
  );

  // Calculate pricing for each tier for display
  const tierPriceEstimates = useMemo(() => {
    const estimates: Record<
      string,
      { originalTotalCents: number; finalTotalCents: number }
    > = {};

    for (const t of tiers) {
      const slots = tierSlots[t.id] || [];
      // For estimate, use chosen item if filled, or fallback to current item
      const itemsForEstimate = Array.from({ length: t.quantity }).map((_, idx) => {
        const item = slots[idx];
        return {
          productId: item?.id || currentEligible.id,
          priceCents: item?.effectivePriceCents || currentEligible.effectivePriceCents,
        };
      });

      const calc = calculateComboPrice(itemsForEstimate, t.discountPercent);
      estimates[t.id] = {
        originalTotalCents: calc.originalTotalCents,
        finalTotalCents: calc.finalTotalCents,
      };
    }
    return estimates;
  }, [tiers, tierSlots, currentEligible]);

  function openPickerForSlot(tierId: string, slotIdx: number) {
    setActivePickingTierId(tierId);
    setActivePickingSlotIdx(slotIdx);
    setIsPickerOpen(true);
    setValidationError(null);
  }

  function handleSlotSelect(picked: ComboEligibleProduct) {
    if (!activePickingTierId) return;

    setTierSlots((prev) => {
      const current = [...(prev[activePickingTierId] || [])];
      current[activePickingSlotIdx] = picked;
      return {
        ...prev,
        [activePickingTierId]: current,
      };
    });
    setValidationError(null);
  }

  function handleAddToCart() {
    if (!availability.purchasable) return;
    setValidationError(null);

    // Standard single product purchase
    if (selectedMode === "STANDARD") {
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: pricing.effectiveCents,
        image: product.images[0] || "/placeholder.jpg",
      }, 1);
      return;
    }

    // Combo tier purchase
    if (!activeTier) return;

    const slots = tierSlots[activeTier.id] || [];
    const missingIndex = slots.findIndex((s) => s === null);
    if (missingIndex !== -1) {
      setValidationError(`Please select item #${missingIndex + 1} to complete your ${activeTier.label}.`);
      openPickerForSlot(activeTier.id, missingIndex);
      return;
    }

    // All slots filled! Calculate server-mirrored bundle price
    const filledItems = slots as ComboEligibleProduct[];
    const calc = calculateComboPrice(
      filledItems.map((i) => ({ productId: i.id, priceCents: i.effectivePriceCents })),
      activeTier.discountPercent,
    );

    const comboGroupId = `cb_${combo.id}_${activeTier.id}_${Date.now()}`;
    const bundleName = `${activeTier.label} (${activeTier.discountPercent}% OFF)`;

    addItem({
      productId: comboGroupId,
      slug: product.slug,
      name: bundleName,
      priceCents: calc.finalTotalCents,
      image: currentEligible.image,
      combo: {
        comboId: combo.id,
        tierId: activeTier.id,
        comboName: combo.name,
        tierLabel: activeTier.label,
        discountPercent: activeTier.discountPercent,
        originalTotalCents: calc.originalTotalCents,
        items: filledItems.map((item) => ({
          productId: item.id,
          slug: item.slug,
          name: item.name,
          image: item.image,
          priceCents: item.effectivePriceCents,
          qty: 1,
        })),
      },
    }, 1);
  }

  function handleBuyNow() {
    if (!availability.purchasable) return;
    setValidationError(null);

    if (selectedMode === "STANDARD") {
      setBuyNowItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: pricing.effectiveCents,
        image: product.images[0] || "/placeholder.jpg",
        qty: 1,
      });
      router.push("/checkout");
      return;
    }

    if (!activeTier) return;

    const slots = tierSlots[activeTier.id] || [];
    const missingIndex = slots.findIndex((s) => s === null);
    if (missingIndex !== -1) {
      setValidationError(`Please select item #${missingIndex + 1} to complete your ${activeTier.label}.`);
      openPickerForSlot(activeTier.id, missingIndex);
      return;
    }

    const filledItems = slots as ComboEligibleProduct[];
    const calc = calculateComboPrice(
      filledItems.map((i) => ({ productId: i.id, priceCents: i.effectivePriceCents })),
      activeTier.discountPercent,
    );

    const comboGroupId = `cb_${combo.id}_${activeTier.id}_${Date.now()}`;
    const bundleName = `${activeTier.label} (${activeTier.discountPercent}% OFF)`;

    setBuyNowItem({
      productId: comboGroupId,
      slug: product.slug,
      name: bundleName,
      priceCents: calc.finalTotalCents,
      image: currentEligible.image,
      qty: 1,
      combo: {
        comboId: combo.id,
        tierId: activeTier.id,
        comboName: combo.name,
        tierLabel: activeTier.label,
        discountPercent: activeTier.discountPercent,
        originalTotalCents: calc.originalTotalCents,
        items: filledItems.map((item) => ({
          productId: item.id,
          slug: item.slug,
          name: item.name,
          image: item.image,
          priceCents: item.effectivePriceCents,
          qty: 1,
        })),
      },
    });
    router.push("/checkout");
  }

  const activeSlotIds = (activePickingTierId ? tierSlots[activePickingTierId] : [])
    .filter(Boolean)
    .map((p) => p!.id);

  return (
    <div className="w-full space-y-4">
      {/* Section Divider with Title matching screenshot */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-black/15" />
        <span className="text-xs font-black uppercase tracking-wider text-black/85 flex items-center gap-1.5">
          {combo.headline || "BUY MORE GET MORE 🔥"}
        </span>
        <div className="flex-1 h-px bg-black/15" />
      </div>

      {/* Validation Message */}
      {validationError && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 animate-in fade-in">
          {validationError}
        </div>
      )}

      {/* Card 1: STANDARD PRICE */}
      <div
        onClick={() => setSelectedMode("STANDARD")}
        className={`rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between ${
          selectedMode === "STANDARD"
            ? "bg-white border-2 border-blue-600 shadow-sm"
            : "bg-[#E2E2E2] hover:bg-[#D8D8D8] border border-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* A real radio, not a styled circle: the card's onClick serves the
              mouse, but only a focusable control with radio semantics can be
              reached by keyboard or announced by a screen reader. Sharing one
              name with the tiers below is what makes arrow keys move between
              the options. */}
          <input
            type="radio"
            name="combo-mode"
            value="STANDARD"
            checked={selectedMode === "STANDARD"}
            onChange={() => setSelectedMode("STANDARD")}
            aria-label={`Standard price, ${formatPrice(pricing.effectiveCents)}`}
            className="w-5 h-5 shrink-0 accent-blue-600 cursor-pointer"
          />
          <span className="font-extrabold text-sm tracking-wide text-black uppercase">
            STANDARD PRICE
          </span>
        </div>
        <div className="font-extrabold text-base text-black font-mono">
          {formatPrice(pricing.effectiveCents)}
        </div>
      </div>

      {/* Dynamic Tier Cards (e.g. Buy 2, Buy 3) */}
      {tiers.map((tier) => {
        const isSelected = selectedMode === tier.id;
        const slots = tierSlots[tier.id] || [];
        const estimate = tierPriceEstimates[tier.id] || {
          originalTotalCents: 0,
          finalTotalCents: 0,
        };

        return (
          <div
            key={tier.id}
            onClick={() => setSelectedMode(tier.id)}
            className={`rounded-xl p-4 cursor-pointer transition-all relative ${
              isSelected
                ? "bg-white border-2 border-blue-600 shadow-sm"
                : "bg-[#E2E2E2] hover:bg-[#D8D8D8] border border-transparent"
            }`}
          >
            {/* "MOST POPULAR 🔥" Badge pinned top-right */}
            {tier.isPopular && (
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-black text-white text-[10px] font-extrabold rounded-full flex items-center gap-1 uppercase tracking-wider shadow-sm z-10">
                <span>MOST POPULAR 🔥</span>
              </div>
            )}

            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <input
                  type="radio"
                  name="combo-mode"
                  value={tier.id}
                  checked={isSelected}
                  onChange={() => setSelectedMode(tier.id)}
                  aria-label={`${tier.label}, ${tier.badgeText}`}
                  className="w-5 h-5 shrink-0 accent-blue-600 cursor-pointer"
                />

                {/* Tier Title */}
                <span className="font-extrabold text-sm tracking-wide text-black uppercase">
                  {tier.label}
                </span>

                {/* Red Discount Pill Badge */}
                <span className="px-2 py-0.5 bg-[#FF0000] text-white text-[10px] sm:text-[11px] font-black tracking-wide rounded-full uppercase">
                  {tier.badgeText}
                </span>
              </div>

              {/* Price Right */}
              <div className="text-right shrink-0">
                <div className="font-extrabold text-base text-black font-mono leading-none">
                  {formatPrice(estimate.finalTotalCents)}
                </div>
                {estimate.originalTotalCents > estimate.finalTotalCents && (
                  <div className="text-xs text-black/50 line-through font-mono font-medium mt-1">
                    {formatPrice(estimate.originalTotalCents)}
                  </div>
                )}
              </div>
            </div>

            {/* Subtext */}
            <p className="text-xs text-black/70 font-medium mt-1.5 ml-7.5">
              {tier.subtext || `Choose Any ${tier.quantity} caps here 👇`}
            </p>

            {/* Product Slots (Visible when tier is selected) */}
            {isSelected && (
              <div className="mt-4 pt-3 border-t border-black/10 space-y-2.5 animate-in fade-in duration-200">
                {Array.from({ length: tier.quantity }).map((_, slotIdx) => {
                  const item = slots[slotIdx];

                  return (
                    <div
                      key={slotIdx}
                      className="flex items-center justify-between gap-3 p-2 bg-paper/60 border border-black/10 rounded-xl"
                    >
                      {item ? (
                        // Filled Slot
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-white border border-black/10 overflow-hidden relative shrink-0">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-black uppercase tracking-tight line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-black/60 font-mono">
                              {formatPrice(item.effectivePriceCents)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Empty Slot
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                            <Plus size={16} strokeWidth={2.5} />
                          </div>
                          <span className="text-xs font-semibold text-black/60">
                            Item #{slotIdx + 1}
                          </span>
                        </div>
                      )}

                      {/* Action Button for slot */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPickerForSlot(tier.id, slotIdx);
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-colors shrink-0 ${
                          item
                            ? "bg-black/5 hover:bg-black/10 text-black border border-black/15"
                            : "bg-black hover:bg-neutral-800 text-white shadow-xs"
                        }`}
                      >
                        {item ? "Change" : "Select here"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Buttons matching screenshot layout */}
      <div className="pt-2 space-y-3">
        {/* ADD TO CART */}
        <button
          type="button"
          disabled={!availability.purchasable}
          onClick={handleAddToCart}
          className="w-full py-3.5 bg-white hover:bg-black hover:text-white border-2 border-black rounded-lg text-black font-extrabold text-sm tracking-widest transition-all uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {availability.purchasable ? "ADD TO CART" : availability.label.toUpperCase()}
        </button>

        {/* CHECK STOCK IN OUTLET / BUY NOW */}
        <button
          type="button"
          disabled={!availability.purchasable}
          onClick={handleBuyNow}
          className="w-full py-3.5 bg-[#F06C4E] hover:bg-[#E25939] active:scale-[0.99] text-white font-extrabold text-sm tracking-widest rounded-lg transition-all uppercase shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CHECK STOCK IN OUTLET
        </button>
      </div>

      {/* Trust Badges matching screenshot */}
      <div className="pt-4 grid grid-cols-3 gap-2 text-center border-t border-black/10">
        <div className="flex flex-col items-center gap-1.5 p-2">
          <Truck className="w-5 h-5 text-black/70" />
          <span className="text-[11px] font-semibold text-black/80 leading-tight">
            Cash on<br />Delivery
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 p-2">
          <Package className="w-5 h-5 text-black/70" />
          <span className="text-[11px] font-semibold text-black/80 leading-tight">
            Premium<br />Packaging
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 p-2">
          <ShieldCheck className="w-5 h-5 text-black/70" />
          <span className="text-[11px] font-semibold text-black/80 leading-tight">
            6 Months<br />Warranty
          </span>
        </div>
      </div>

      {/* Product Selection Modal */}
      <ProductSlotPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        products={combo.products}
        onSelect={handleSlotSelect}
        slotIndex={activePickingSlotIdx}
        currentlySelectedIds={activeSlotIds}
        allowSameProduct={combo.allowSameProduct}
      />
    </div>
  );
}
