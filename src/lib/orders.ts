import { db } from "@/lib/db";
import { getProductBySlug } from "@/lib/products";
import { recordStockChange } from "@/lib/inventory";

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

// Statuses where the order's units have already been taken out of stock.
// PENDING is deliberately absent: an unconfirmed order reserves nothing, it
// only shows up as "committed" on the inventory screen.
const STOCK_COMMITTED_STATUSES = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

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
  trackingNumber?: string
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
        },
      },
    };

    if (trackingNumber !== undefined) {
      data.trackingNumber = trackingNumber;
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
    const hadCommittedStock = STOCK_COMMITTED_STATUSES.includes(existing.status);
    const hasCommittedStock = STOCK_COMMITTED_STATUSES.includes(status);

    if (!hadCommittedStock && hasCommittedStock) {
      await applyOrderStock(existing.items, orderId, "SALE", -1);
    } else if (hadCommittedStock && !hasCommittedStock) {
      // A confirmed order that gets cancelled used to leave its units
      // deducted forever; put them back on the shelf instead.
      await applyOrderStock(existing.items, orderId, "RETURN", 1);
    }

    return updated;
  } catch (error) {
    console.error("DB updateOrderStatus error:", error);
    throw error;
  }
}
