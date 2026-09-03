import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductBySlug } from "@/lib/products";
import { createPendingOrder } from "@/lib/orders";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(200),
    phone: z.string().min(6).max(20),
    address: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
  }),
});

// Prices are always re-looked-up server-side from the product catalog —
// never trust priceCents sent by the client.
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 });
  }

  for (const { slug, qty } of parsed.data.items) {
    const product = await getProductBySlug(slug);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product: ${slug}` },
        { status: 400 },
      );
    }
    // Don't take an order the shop can't fill. Stock only commits when an
    // admin confirms the call, so this is a checkout-time sanity check, not
    // a reservation — the out-of-stock flag is the manual switch, stockQty
    // the live count when it's tracked.
    if (!product.inStock) {
      return NextResponse.json(
        { error: `${product.name} is out of stock.` },
        { status: 409 },
      );
    }
    if (typeof product.stockQty === "number" && qty > product.stockQty) {
      return NextResponse.json(
        {
          error:
            product.stockQty > 0
              ? `Only ${product.stockQty} of ${product.name} left.`
              : `${product.name} is out of stock.`,
        },
        { status: 409 },
      );
    }
  }

  const tran_id = `KZ-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

  // No online payment — the order is recorded as PENDING and an admin
  // calls the customer to confirm it (see /admin/orders). tran_id doubles
  // as the order's unique ID, shown to the customer on success and to the
  // admin in the dashboard. Prices are re-looked-up from the catalog
  // inside createPendingOrder itself, never trusted from the client.
  const order = await createPendingOrder({
    tranId: tran_id,
    customer: parsed.data.customer,
    items: parsed.data.items,
  });

  if (!order) {
    return NextResponse.json(
      { error: "Couldn't place your order right now. Please try again or contact us." },
      { status: 502 },
    );
  }

  return NextResponse.json({ orderId: order.tranId });
}
