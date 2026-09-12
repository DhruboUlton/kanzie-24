import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductBySlug } from "@/lib/products";
import { createPendingOrder } from "@/lib/orders";
import { shippingFeeCents } from "@/lib/shipping";
import { CouponError } from "@/lib/coupons-shared";
import { UnavailableProductError } from "@/lib/orders";

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
    email: z.string().email().max(200).optional().or(z.literal("")),
    phone: z.string().min(6).max(20),
    address: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    postalCode: z.string().max(20).optional(),
  }),
  shippingMethod: z
    .enum(["inside_dhaka", "outside_dhaka"])
    .optional()
    .default("inside_dhaka"),
  couponCode: z.string().trim().optional(),
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
  const shippingMethod = parsed.data.shippingMethod;
  // Derived here from the method the client named, never taken as a price:
  // the browser chooses which rate applies, the server decides what it costs.
  const shippingCents = shippingFeeCents(shippingMethod);
  const customerEmail =
    parsed.data.customer.email?.trim() ||
    `${parsed.data.customer.phone.replace(/[^0-9]/g, "") || "guest"}@customer.local`;

  // No online payment — the order is recorded as PENDING and an admin
  // calls the customer to confirm it (see /adpnl/orders). tran_id doubles
  // as the order's unique ID, shown to the customer on success and to the
  // admin in the dashboard. Prices are re-looked-up from the catalog
  // inside createPendingOrder itself, never trusted from the client.
  try {
    const order = await createPendingOrder({
      tranId: tran_id,
      customer: {
        ...parsed.data.customer,
        email: customerEmail,
      },
      items: parsed.data.items,
      couponCode: parsed.data.couponCode,
      shippingMethod,
    });

    if (!order) {
      return NextResponse.json(
        { error: "Couldn't place your order right now. Please try again or contact us." },
        { status: 502 },
      );
    }

    // The totals come back so the confirmation screen can show what was
    // actually written, not what the browser had computed. The two can differ
    // whenever the cart moved after a coupon was applied, and the customer
    // should be shown the figure that is in the order.
    return NextResponse.json({
      orderId: order.tranId,
      subtotalCents: order.totalAmountCents + order.discountAmountCents - shippingCents,
      shippingAmountCents: shippingCents,
      discountAmountCents: order.discountAmountCents,
      totalAmountCents: order.totalAmountCents,
      couponCode: order.couponCode,
    });
  } catch (error) {
    // A coupon problem is worth telling the customer about; anything else is
    // an internal fault, and echoing its message back would leak the shape of
    // the database or the stack into a public response.
    // A coupon or availability problem is the customer's to see and act on;
    // anything else is an internal fault whose message stays on the server.
    if (error instanceof CouponError || error instanceof UnavailableProductError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Checkout failed:", error);
    return NextResponse.json(
      { error: "Couldn't place your order right now. Please try again or contact us." },
      { status: 502 },
    );
  }
}
