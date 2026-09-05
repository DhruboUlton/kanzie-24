import { formatPrice } from "./format";

/**
 * A coupon problem the customer is meant to read: the code is spent, the cart
 * no longer meets the minimum, and so on. Anything else thrown during
 * checkout is an internal fault whose text must not reach the storefront.
 */
export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export type CouponDiscountType = "PERCENTAGE" | "FIXED";
export type CouponStatus = "Active" | "Inactive" | "Limit Reached";

export type CouponView = {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number; // percentage (e.g. 20) or fixed cents (e.g. 50000 = ৳500)
  minimumOrderAmountCents: number | null;
  usageLimit: number | null; // null for unlimited
  usageCount: number;
  note: string | null;
  isActive: boolean;
  status: CouponStatus;
  remainingUses: number | null; // null for unlimited
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type CouponUsageRowView = {
  id: string;
  couponId: string;
  couponCode: string;
  orderId: string;
  tranId?: string;
  orderStatus?: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  discountAmountCents: number;
  orderSubtotalCents: number;
  finalOrderAmountCents: number;
  /** Set when the order was cancelled and the redemption was handed back. */
  releasedAt: Date | string | null;
  createdAt: Date | string;
};

export type CouponDashboardMetrics = {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGivenCents: number;
  averageDiscountCents: number;
  mostUsedCoupon: {
    code: string;
    usageCount: number;
    discountType: CouponDiscountType;
    discountValue: number;
  } | null;
  nearLimitCount: number;
};

// Unambiguous alphabet: excludes 0, O, 1, I
export const CODE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a single cryptographically secure random coupon code.
 */
export function generateSecureCouponCode(length: number = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  return code;
}

/**
 * Normalizes coupon code: trim whitespace, strip internal control characters, convert to uppercase.
 */
export function normalizeCouponCode(code: string): string {
  if (!code) return "";
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

/**
 * Derives the active/inactive/limit status of a coupon.
 */
export function deriveCouponStatus(
  isActive: boolean,
  usageLimit: number | null,
  usageCount: number,
): CouponStatus {
  if (!isActive) return "Inactive";
  if (usageLimit !== null && usageCount >= usageLimit) return "Limit Reached";
  return "Active";
}

/**
 * Calculates remaining redemptions. Returns null if unlimited.
 */
export function calculateRemainingUses(
  usageLimit: number | null,
  usageCount: number,
): number | null {
  if (usageLimit === null) return null;
  return Math.max(0, usageLimit - usageCount);
}

export type DiscountCalculationResult = {
  eligible: boolean;
  discountAmountCents: number;
  finalSubtotalCents: number;
  error?: string;
};

/**
 * Pure calculation engine for coupon discount.
 * Never allows discount to exceed subtotal.
 * Never produces negative final total.
 */
export function calculateCouponDiscount(params: {
  subtotalCents: number;
  discountType: string;
  discountValue: number;
  minimumOrderAmountCents?: number | null;
}): DiscountCalculationResult {
  const { subtotalCents, discountType, discountValue, minimumOrderAmountCents } = params;

  // Number.isFinite, not `< 0`: NaN fails every comparison, so a NaN subtotal
  // slipped past a `< 0` check and produced a NaN discount that read as a
  // valid one. Same for the coupon's own value below.
  if (!Number.isFinite(subtotalCents) || subtotalCents < 0) {
    return { eligible: false, discountAmountCents: 0, finalSubtotalCents: 0, error: "Invalid order subtotal." };
  }

  if (!Number.isFinite(discountValue)) {
    return { eligible: false, discountAmountCents: 0, finalSubtotalCents: subtotalCents, error: "Invalid discount value." };
  }

  // Minimum order requirement check
  if (
    typeof minimumOrderAmountCents === "number" &&
    Number.isFinite(minimumOrderAmountCents) &&
    minimumOrderAmountCents > 0 &&
    subtotalCents < minimumOrderAmountCents
  ) {
    return {
      eligible: false,
      discountAmountCents: 0,
      finalSubtotalCents: subtotalCents,
      error: `Minimum order amount of ${formatPrice(minimumOrderAmountCents)} required to use this coupon.`,
    };
  }

  let calculatedDiscount = 0;

  if (discountType === "PERCENTAGE") {
    if (discountValue <= 0 || discountValue > 100) {
      return { eligible: false, discountAmountCents: 0, finalSubtotalCents: subtotalCents, error: "Invalid percentage discount value." };
    }
    calculatedDiscount = Math.round((subtotalCents * discountValue) / 100);
  } else if (discountType === "FIXED") {
    if (discountValue <= 0) {
      return { eligible: false, discountAmountCents: 0, finalSubtotalCents: subtotalCents, error: "Invalid fixed discount value." };
    }
    calculatedDiscount = discountValue;
  } else {
    return { eligible: false, discountAmountCents: 0, finalSubtotalCents: subtotalCents, error: "Unsupported discount type." };
  }

  // Cap discount at eligible subtotal
  const actualDiscountCents = Math.min(calculatedDiscount, subtotalCents);
  const finalSubtotalCents = Math.max(0, subtotalCents - actualDiscountCents);

  return {
    eligible: true,
    discountAmountCents: actualDiscountCents,
    finalSubtotalCents,
  };
}

/**
 * Formats discount value for UI display (e.g. "20%" or "৳500.00").
 */
export function formatDiscountValue(type: string, value: number): string {
  if (type === "PERCENTAGE") {
    return `${value}%`;
  }
  return formatPrice(value);
}
