import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSSLCommerzSession } from "@/lib/sslcommerz";
import { getProductBySlug } from "@/lib/products";

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

  let totalCents = 0;
  let numOfItem = 0;
  const productNames: string[] = [];
  for (const { slug, qty } of parsed.data.items) {
    const product = await getProductBySlug(slug);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product: ${slug}` },
        { status: 400 },
      );
    }
    totalCents += product.priceCents * qty;
    numOfItem += qty;
    productNames.push(product.name);
  }

  const origin = req.nextUrl.origin;
  const tran_id = `KZ-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

  try {
    const session = await createSSLCommerzSession({
      tran_id,
      totalAmountTaka: totalCents / 100,
      success_url: `${origin}/api/checkout/sslcommerz/success`,
      fail_url: `${origin}/api/checkout/sslcommerz/fail`,
      cancel_url: `${origin}/api/checkout/sslcommerz/cancel`,
      ipn_url: `${origin}/api/checkout/sslcommerz/ipn`,
      productName: productNames.join(", ").slice(0, 255),
      numOfItem,
      customer: parsed.data.customer,
    });
    return NextResponse.json({ url: session.GatewayPageURL });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("SSLCOMMERZ_")
        ? "Checkout isn't configured yet. Add SSLCommerz credentials to your environment to enable payments."
        : "Couldn't start checkout. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
