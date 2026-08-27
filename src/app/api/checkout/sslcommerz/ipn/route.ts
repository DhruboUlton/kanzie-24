import { NextRequest, NextResponse } from "next/server";
import { validateSSLCommerzPayment } from "@/lib/sslcommerz";

// Server-to-server notification, independent of whether the customer's
// browser ever reaches success_url. Always 200 — SSLCommerz retries on
// non-2xx and there's nothing here yet that a retry would fix.
//
// TODO: once orders are persisted (there's no database in this app yet —
// see src/lib/products.ts), record the validated transaction here: mark
// the order paid, trigger fulfillment/email.
export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const val_id = formData?.get("val_id");

  if (typeof val_id === "string") {
    try {
      await validateSSLCommerzPayment(val_id);
    } catch {
      // Nothing to persist yet — see TODO above.
    }
  }

  return NextResponse.json({ received: true });
}
