/**
 * Delivery rates, in one place.
 *
 * The figure the customer is shown, the figure the server charges and the
 * figure written to the order all have to be the same number; they were three
 * separate literals, which is a drift waiting to happen on a money value.
 * Browser-safe — no database import — so the checkout form reads the same
 * table the API does.
 */

export type ShippingMethod = "inside_dhaka" | "outside_dhaka";

export const SHIPPING_RATES: Record<
  ShippingMethod,
  { labelEn: string; labelBn: string; cents: number }
> = {
  inside_dhaka: {
    labelEn: "Inside Dhaka",
    labelBn: "ঢাকার ভিতর",
    cents: 8000,
  },
  outside_dhaka: {
    labelEn: "Outside Dhaka",
    labelBn: "ঢাকার বাহিরে",
    cents: 10000,
  },
};

export const DEFAULT_SHIPPING_METHOD: ShippingMethod = "inside_dhaka";

/**
 * Whether a value names a rate we actually have.
 *
 * Anything reaching this from outside the app — a saved checkout form from
 * before a rate was renamed, a hand-edited localStorage entry — is a string,
 * not a ShippingMethod, and indexing the table with it yields undefined.
 * Reading `.cents` off that threw during render and took the whole checkout
 * page down, so the cast this replaces was the bug.
 */
export function isShippingMethod(value: unknown): value is ShippingMethod {
  return typeof value === "string" && Object.hasOwn(SHIPPING_RATES, value);
}

/** The delivery charge for a method, in cents. */
export function shippingFeeCents(method: ShippingMethod): number {
  return SHIPPING_RATES[method].cents;
}

/** e.g. "Inside Dhaka (৳80.00)" — for order notes and admin display. */
export function shippingLabel(method: ShippingMethod): string {
  const rate = SHIPPING_RATES[method];
  return `${rate.labelEn} (৳${(rate.cents / 100).toFixed(2)})`;
}
