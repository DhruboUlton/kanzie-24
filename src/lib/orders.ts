import { db } from "@/lib/db";
import { getProductBySlug } from "@/lib/products";

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
}) {
  let totalAmountCents = 0;
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

    const itemTotal = product.priceCents * item.qty;
    totalAmountCents += itemTotal;

    lineItemsData.push({
      productId: product.id && product.id.length > 5 ? product.id : undefined,
      productName: product.name,
      productSku: product.sku,
      productSlug: product.slug,
      unitPriceCents: product.priceCents,
      qty: item.qty,
      totalPriceCents: itemTotal,
    });
  }

  try {
    const order = await db.order.create({
      data: {
        tranId: params.tranId,
        status: "PENDING",
        totalAmountCents,
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
            note: "Order initiated via checkout",
          },
        },
      },
      include: {
        items: true,
      },
    });
    return order;
  } catch (error) {
    console.warn("DB order create skipped/error (running in fallback mode if DB not yet connected):", error);
    return null;
  }
}

export async function recordPaymentSuccess(params: {
  tranId: string;
  valId?: string;
  bankTranId?: string;
  cardType?: string;
  paidAmountTaka?: number;
  currency?: string;
}) {
  try {
    const existingOrder = await db.order.findUnique({
      where: { tranId: params.tranId },
      include: { items: true },
    });

    if (!existingOrder) return null;

    // Idempotency: if already marked PAID or later stage, return without re-applying
    if (existingOrder.status !== "PENDING" && existingOrder.status !== "FAILED") {
      return existingOrder;
    }

    // Verify amount if provided
    if (params.paidAmountTaka !== undefined) {
      const expectedTaka = existingOrder.totalAmountCents / 100;
      if (Math.abs(expectedTaka - params.paidAmountTaka) > 0.5) {
        console.error(
          `Amount mismatch for ${params.tranId}: Expected ${expectedTaka}, received ${params.paidAmountTaka}`
        );
      }
    }

    // Update order status
    const updatedOrder = await db.order.update({
      where: { tranId: params.tranId },
      data: {
        status: "PAID",
        valId: params.valId ?? existingOrder.valId,
        bankTranId: params.bankTranId ?? existingOrder.bankTranId,
        cardType: params.cardType ?? existingOrder.cardType,
        events: {
          create: {
            status: "PAID",
            note: `Payment verified (${params.cardType || "Gateway"}) - ValID: ${params.valId || "N/A"}`,
          },
        },
      },
      include: { items: true },
    });

    // Decrement stock for purchased products
    for (const item of existingOrder.items) {
      if (item.productId) {
        try {
          await db.product.update({
            where: { id: item.productId },
            data: {
              stockQty: { decrement: item.qty },
            },
          });
        } catch {
          // ignore if product is unlinked
        }
      }
    }

    return updatedOrder;
  } catch (error) {
    console.warn("DB recordPaymentSuccess error:", error);
    return null;
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string,
  trackingNumber?: string
) {
  try {
    const data: any = {
      status,
      events: {
        create: {
          status,
          note: note || `Order marked as ${status}`,
        },
      },
    };

    if (trackingNumber !== undefined) {
      data.trackingNumber = trackingNumber;
    }

    return await db.order.update({
      where: { id: orderId },
      data,
      include: { items: true, events: true },
    });
  } catch (error) {
    console.error("DB updateOrderStatus error:", error);
    throw error;
  }
}
