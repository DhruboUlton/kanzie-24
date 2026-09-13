// Pure types and pricing math for Combos / "Buy More, Get More" promotions.
// Deliberately free of database or server-only imports so client components can use it.

export type ComboTierSummary = {
  id: string;
  quantity: number;
  discountPercent: number;
  label: string;
  badgeText: string;
  subtext: string | null;
  isPopular: boolean;
  sortOrder: number;
};

export type ComboEligibleProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  priceCents: number;
  effectivePriceCents: number;
  image: string;
  inStock: boolean;
  stockQty?: number | null;
  categoryName?: string;
};

export type StorefrontCombo = {
  id: string;
  name: string;
  headline: string;
  subtext: string | null;
  allowSameProduct: boolean;
  isActive: boolean;
  tiers: ComboTierSummary[];
  products: ComboEligibleProduct[];
};

export type CalculatedComboPrice = {
  originalTotalCents: number;
  discountAmountCents: number;
  finalTotalCents: number;
  itemPrices: {
    productId: string;
    originalPriceCents: number;
    discountedPriceCents: number;
  }[];
};

/**
 * Calculates combo pricing given an array of items and discount percentage.
 * Distributes discount so sum(discountedPriceCents) == finalTotalCents exactly.
 */
export function calculateComboPrice(
  items: { productId: string; priceCents: number }[],
  discountPercent: number,
): CalculatedComboPrice {
  const originalTotalCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  const discountAmountCents = Math.round((originalTotalCents * discountPercent) / 100);
  const finalTotalCents = Math.max(0, originalTotalCents - discountAmountCents);

  if (items.length === 0 || originalTotalCents <= 0) {
    return {
      originalTotalCents: 0,
      discountAmountCents: 0,
      finalTotalCents: 0,
      itemPrices: [],
    };
  }

  // Proportionally allocate discounted cents across items to avoid off-by-one errors
  let allocatedTotal = 0;
  const itemPrices = items.map((item, index) => {
    if (index === items.length - 1) {
      // Last item absorbs remaining cents
      const discountedPriceCents = Math.max(0, finalTotalCents - allocatedTotal);
      return {
        productId: item.productId,
        originalPriceCents: item.priceCents,
        discountedPriceCents,
      };
    }
    const ratio = item.priceCents / originalTotalCents;
    // Capped at what is still unallocated. Without the cap, enough items
    // rounding up overshoots the total, the last item's share clamps at zero
    // and the lines add up to more than the bundle's own price.
    const remaining = finalTotalCents - allocatedTotal;
    const discountedPriceCents = Math.min(
      Math.max(0, remaining),
      Math.round(finalTotalCents * ratio),
    );
    allocatedTotal += discountedPriceCents;
    return {
      productId: item.productId,
      originalPriceCents: item.priceCents,
      discountedPriceCents,
    };
  });

  return {
    originalTotalCents,
    discountAmountCents,
    finalTotalCents,
    itemPrices,
  };
}
