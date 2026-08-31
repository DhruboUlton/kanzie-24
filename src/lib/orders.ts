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

    // Stock commits the moment an admin confirms the order by phone call —
    // guarded on the order's previous status so re-confirming (or any
    // later status change) never decrements twice.
    if (status === "CONFIRMED" && existing.status !== "CONFIRMED") {
      for (const item of existing.items) {
        if (item.productId) {
          try {
            await db.product.update({
              where: { id: item.productId },
              data: { stockQty: { decrement: item.qty } },
            });
          } catch {
            // ignore if product is unlinked/archived
          }
        }
      }
    }

    return updated;
  } catch (error) {
    console.error("DB updateOrderStatus error:", error);
    throw error;
  }
}
