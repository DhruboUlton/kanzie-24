import { db } from "@/lib/db";
import { getProductBySlug } from "@/lib/products";
import { recordStockChange } from "@/lib/inventory";
import { STOCK_COMMITTED_STATUSES, holdsCouponRedemption } from "@/lib/order-status";

import {
  validateCouponForCheckout,
  redeemCouponInTransaction,
  releaseCouponForOrder,
  restoreCouponForOrder,
} from "@/lib/coupons";
import { CouponError } from "@/lib/coupons-shared";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";

/**
 * A problem with the basket the customer is allowed to read: a product that
 * has gone unavailable between adding it and checking out. Distinct from an
 * internal fault, whose text must never reach the storefront.
 */
export class UnavailableProductError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnavailableProductError";
  }
}

export type CreateOrderItemInput = {
  slug: string;
  qty: number;
};

export type CustomerInput = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

export async function createPendingOrder(params: {
  tranId: string;
  customer: CustomerInput;
  items: CreateOrderItemInput[];
  couponCode?: string;
}) {
  let subtotalCents = 0;
  const lineItemsData: {
    productId?: string;
    productName: string;
    productSku: string;
    productSlug: string;
    unitPriceCents: number;
    qty: number;
    totalPriceCents: number;
  }[] = [];

  for (const item of params.items) {
    const product = await getProductBySlug(item.slug);
    if (!product) {
      throw new Error(`Product not found: ${item.slug}`);
    }

    // The authoritative availability check. Disabling the button is a
    // courtesy; this is the part that cannot be clicked around, whether the
    // request came from the cart, Buy Now, the video widget or curl.
    const availability = resolveAvailability(product);
    if (!availability.purchasable) {
      throw new UnavailableProductError(
        `${product.name} is ${availability.label.toLowerCase()} and can no longer be ordered.`,
      );
    }

    // Priced from the catalogue by the same function the storefront used, so
    // a sale the customer was shown is the sale they are charged, and a stale
    // price posted by a client is ignored.
    const unitPriceCents = resolvePricing(product).effectiveCents;
    const itemTotal = unitPriceCents * item.qty;
    subtotalCents += itemTotal;

    lineItemsData.push({
      productId: product.id && product.id.length > 5 ? product.id : undefined,
      productName: product.name,
      productSku: product.sku,
      productSlug: product.slug,
      unitPriceCents,
      qty: item.qty,
      totalPriceCents: itemTotal,
    });
  }

  let discountAmountCents = 0;
  let appliedCouponId: string | undefined = undefined;
  let appliedCouponCode: string | undefined = undefined;

  if (params.couponCode && params.couponCode.trim()) {
    const validation = await validateCouponForCheckout(params.couponCode, subtotalCents);
    if (!validation.valid || !validation.coupon) {
      throw new CouponError(validation.error || "That coupon could not be applied.");
    }
    discountAmountCents = validation.coupon.discountAmountCents;
    appliedCouponId = validation.coupon.id;
    appliedCouponCode = validation.coupon.code;
  }

  const finalTotalAmountCents = Math.max(0, subtotalCents - discountAmountCents);

  try {
    const order = await db.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          tranId: params.tranId,
          status: "PENDING",
          totalAmountCents: finalTotalAmountCents,
          discountAmountCents,
          couponId: appliedCouponId ?? null,
          couponCode: appliedCouponCode ?? null,
          currency: "BDT",
          customerName: params.customer.name,
          customerEmail: params.customer.email,
          customerPhone: params.customer.phone,
          customerAddress: params.customer.address,
          customerCity: params.customer.city,
          items: {
            create: lineItemsData,
          },
          events: {
            create: {
              status: "PENDING",
              note: appliedCouponCode
                ? `Order initiated via checkout with coupon ${appliedCouponCode}`
                : "Order initiated via checkout",
            },
          },
        },
        include: {
          items: true,
        },
      });

      if (appliedCouponId) {
        await redeemCouponInTransaction(tx, {
          couponId: appliedCouponId,
          orderId: createdOrder.id,
          discountAmountCents,
          orderSubtotalCents: subtotalCents,
          finalOrderAmountCents: finalTotalAmountCents,
          customer: params.customer,
        });
      }

      return createdOrder;
    });

    return order;
  } catch (error) {
    console.warn("DB order create skipped/error (running in fallback mode if DB not yet connected):", error);
    // Only a coupon problem is the customer's to see and act on. Matching on
    // the error type rather than on the word "Coupon" appearing in the text
    // keeps an unrelated database message from being shown as one.
    if (error instanceof CouponError || error instanceof UnavailableProductError) {
      throw error;
    }
    return null;
  }
}

async function applyOrderStock(
  items: { productId: string | null; qty: number }[],
  orderId: string,
  reason: "SALE" | "RETURN",
  sign: 1 | -1,
) {
  for (const item of items) {
    if (!item.productId) continue;
    try {
      await recordStockChange({
        productId: item.productId,
        delta: sign * item.qty,
        reason,
        orderId,
        note: reason === "SALE" ? "Order confirmed" : "Order cancelled — stock returned",
      });
    } catch {
      // A product that was archived or deleted since the order was placed
      // has nothing to move; the order itself still updates.
    }
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string,
  trackingNumber?: string,
  actor?: { id: string; name: string } | null
) {
  try {
    const existing = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) {
      throw new Error("Order not found");
    }

    const data: any = {
      status,
      events: {
        create: {
          status,
          note: note || `Order marked as ${status}`,
          actorName: actor?.name ?? null,
        },
      },
    };

    if (trackingNumber !== undefined) {
      data.trackingNumber = trackingNumber;
    }

    // Stamped once, on the way into CALLED, and never overwritten — the
    // point is to record who made the call that decided the order, so a
    // later CONFIRMED or CANCELLED must not erase or replace it.
    if (status === "CALLED" && actor && !existing.calledAt) {
      data.calledAt = new Date();
      data.calledById = actor.id;
      data.calledByName = actor.name;
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data,
      include: { items: true, events: true },
    });

    // Stock commits the moment an admin confirms the order by phone call.
    // Both directions are guarded on the order's *previous* status, so
    // re-confirming never double-decrements and cancelling twice never
    // double-credits. Every change goes through recordStockChange so the
    // sellable flag and the audit trail move with the count.
    const hadCommittedStock = (STOCK_COMMITTED_STATUSES as string[]).includes(existing.status);
    const hasCommittedStock = (STOCK_COMMITTED_STATUSES as string[]).includes(status);

    if (!hadCommittedStock && hasCommittedStock) {
      await applyOrderStock(existing.items, orderId, "SALE", -1);
    } else if (hadCommittedStock && !hasCommittedStock) {
      // A confirmed order that gets cancelled used to leave its units
      // deducted forever; put them back on the shelf instead.
      await applyOrderStock(existing.items, orderId, "RETURN", 1);
    }

    // The coupon redemption moves on the same principle as the stock, but on
    // a wider set of statuses: the use is spent from PENDING onwards and is
    // only given back by a cancellation. Guarded on the previous status, so
    // cancelling twice never credits the coupon twice.
    const heldCoupon = holdsCouponRedemption(existing.status);
    const holdsCoupon = holdsCouponRedemption(status);

    if (heldCoupon && !holdsCoupon) {
      await db.$transaction((tx) => releaseCouponForOrder(tx, orderId));
    } else if (!heldCoupon && holdsCoupon) {
      await db.$transaction((tx) => restoreCouponForOrder(tx, orderId));
    }

    return updated;
  } catch (error) {
    console.error("DB updateOrderStatus error:", error);
    throw error;
  }
}
