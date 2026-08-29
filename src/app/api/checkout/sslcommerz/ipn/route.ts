import { NextRequest, NextResponse } from "next/server";
import { validateSSLCommerzPayment } from "@/lib/sslcommerz";
import { recordPaymentSuccess } from "@/lib/orders";

// Server-to-server notification, independent of whether the customer's
// browser ever reaches success_url. Always 200 — SSLCommerz retries on
// non-2xx.
export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const val_id = formData?.get("val_id");
  const tran_id = formData?.get("tran_id");
  const bank_tran_id = formData?.get("bank_tran_id");
  const card_type = formData?.get("card_type");
  const amount = formData?.get("amount");
  const currency = formData?.get("currency");

  if (typeof val_id === "string" && typeof tran_id === "string") {
    try {
      const validation = await validateSSLCommerzPayment(val_id);
      if (validation.status === "VALID" || validation.status === "VALIDATED") {
        await recordPaymentSuccess({
          tranId: tran_id,
          valId: val_id,
          bankTranId: typeof bank_tran_id === "string" ? bank_tran_id : undefined,
          cardType: typeof card_type === "string" ? card_type : undefined,
          paidAmountTaka: amount ? parseFloat(String(amount)) : undefined,
          currency: typeof currency === "string" ? currency : "BDT",
        });
      }
    } catch (err) {
      console.error("IPN payment validation error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
