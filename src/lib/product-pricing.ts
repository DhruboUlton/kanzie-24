// What a product costs and whether it can be bought.
//
// Every surface that shows a price or a buy button reads these two functions:
// the card, the detail page, the video widget, the cart, and the order the
// server actually writes. Nothing recomputes a discount for itself, so a
// badge on a card and the line item in the database cannot disagree.
//
// Deliberately free of server-only imports so client components can use it.

/** The fields either function needs. Wider objects are accepted. */
export type PricedProduct = {
  priceCents: number;
  salePercent?: number | null;
  compareAtPriceCents?: number | null;
};

export type StockedProduct = {
  soldOut?: boolean | null;
  inStock?: boolean | null;
  stockQty?: number | null;
};

export type ProductPricing = {
  /** The list price, before any discount. */
  regularCents: number;
  /** What the customer actually pays. Never above regular, never below zero. */
  effectiveCents: number;
  /** Struck-through price to show beside it, or null when not on sale. */
  originalCents: number | null;
  /** Whole percent off, for the badge. Null when not on sale. */
  percentOff: number | null;
  onSale: boolean;
};

export const MIN_SALE_PERCENT = 1;
export const MAX_SALE_PERCENT = 100;

/** A sale percentage is usable only if it is a whole 1–100. */
export function isValidSalePercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= MIN_SALE_PERCENT &&
    value <= MAX_SALE_PERCENT
  );
}

/**
 * Applies a whole-percent discount to a price in cents.
 * Rounded to the nearest cent so the figure shown is the figure charged.
 */
export function applySalePercent(priceCents: number, percent: number): number {
  const discounted = Math.round(priceCents - (priceCents * percent) / 100);
  return Math.max(0, Math.min(priceCents, discounted));
}

/**
 * Resolves the one price a product is sold at.
 *
 * Precedence is fixed so two fields can never describe two different sales:
 *
 *   1. salePercent set  -> the sale. priceCents is the original, and the
 *      discounted figure is derived. compareAtPriceCents is ignored, which is
 *      why the admin form disables it while a percentage sale is running.
 *   2. compareAtPriceCents above priceCents -> a marked-down product with no
 *      percentage attached. priceCents is what is charged, compare-at is the
 *      original, and the badge percentage is derived from the pair.
 *   3. neither -> no sale.
 *
 * A compare-at at or below the price is not a discount and is dropped rather
 * than rendered as a struck-through number larger than the price.
 */
export function resolvePricing(product: PricedProduct): ProductPricing {
  const regularCents =
    Number.isFinite(product.priceCents) && product.priceCents > 0
      ? Math.round(product.priceCents)
      : 0;

  const percent = product.salePercent;
  if (isValidSalePercent(percent)) {
    const effectiveCents = applySalePercent(regularCents, percent);
    return {
      regularCents,
      effectiveCents,
      originalCents: regularCents,
      percentOff: percent,
      onSale: effectiveCents < regularCents,
    };
  }

  const compareAt = product.compareAtPriceCents;
  if (
    typeof compareAt === "number" &&
    Number.isFinite(compareAt) &&
    compareAt > regularCents
  ) {
    return {
      regularCents,
      effectiveCents: regularCents,
      originalCents: Math.round(compareAt),
      percentOff: Math.round(((compareAt - regularCents) / compareAt) * 100),
      onSale: true,
    };
  }

  return {
    regularCents,
    effectiveCents: regularCents,
    originalCents: null,
    percentOff: null,
    onSale: false,
  };
}

export type AvailabilityStatus = "AVAILABLE" | "SOLD_OUT" | "OUT_OF_STOCK";

export type ProductAvailability = {
  status: AvailabilityStatus;
  /** Whether a purchase may proceed. The server checks this too. */
  purchasable: boolean;
  /** What to print on a badge or a disabled button. */
  label: string;
};

/**
 * Resolves whether a product can be bought, in one place.
 *
 * soldOut is the admin's deliberate switch and outranks everything: a product
 * can be held back while stock sits on the shelf. Below that, the quantity
 * decides. inStock is consulted only as a fallback for records that carry no
 * quantity at all (the seed catalogue), since the stock pipeline keeps it
 * equal to stockQty > 0 anyway.
 */
export function resolveAvailability(
  product: StockedProduct,
): ProductAvailability {
  if (product.soldOut) {
    return { status: "SOLD_OUT", purchasable: false, label: "Sold Out" };
  }

  const qty = product.stockQty;
  if (typeof qty === "number" && Number.isFinite(qty)) {
    return qty > 0
      ? { status: "AVAILABLE", purchasable: true, label: "In Stock" }
      : { status: "OUT_OF_STOCK", purchasable: false, label: "Out of Stock" };
  }

  return product.inStock === false
    ? { status: "OUT_OF_STOCK", purchasable: false, label: "Out of Stock" }
    : { status: "AVAILABLE", purchasable: true, label: "In Stock" };
}

/** "20% OFF" for a badge. Null when there is nothing to advertise. */
export function saleBadgeLabel(pricing: ProductPricing): string | null {
  return pricing.onSale && pricing.percentOff
    ? `${pricing.percentOff}% OFF`
    : null;
}
