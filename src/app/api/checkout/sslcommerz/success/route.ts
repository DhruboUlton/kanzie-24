import { NextRequest, NextResponse } from "next/server";
import { validateSSLCommerzPayment } from "@/lib/sslcommerz";
import { recordPaymentSuccess } from "@/lib/orders";

// SSLCommerz redirects the browser here with a POST after payment.
// val_id alone (from the redirect) is user-controlled and not proof of
// payment — always confirm server-to-server before treating it as paid.
export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const val_id = formData?.get("val_id");
  const tran_id = formData?.get("tran_id");
  const bank_tran_id = formData?.get("bank_tran_id");
  const card_type = formData?.get("card_type");
  const amount = formData?.get("amount");
  const currency = formData?.get("currency");

  if (typeof val_id !== "string" || typeof tran_id !== "string") {
    return NextResponse.redirect(
      new URL("/checkout?error=invalid_response", req.url),
      303,
    );
  }

  try {
    const result = await validateSSLCommerzPayment(val_id);
    if (result.status !== "VALID" && result.status !== "VALIDATED") {
      return NextResponse.redirect(
        new URL("/checkout?error=payment_not_verified", req.url),
        303,
      );
    }

    // Persist payment verification
    await recordPaymentSuccess({
      tranId: tran_id,
      valId: val_id,
      bankTranId: typeof bank_tran_id === "string" ? bank_tran_id : undefined,
      cardType: typeof card_type === "string" ? card_type : undefined,
      paidAmountTaka: amount ? parseFloat(String(amount)) : undefined,
      currency: typeof currency === "string" ? currency : "BDT",
    });
  } catch {
    return NextResponse.redirect(
      new URL("/checkout?error=payment_not_verified", req.url),
      303,
    );
  }

  return NextResponse.redirect(
    new URL(`/checkout/success?tran_id=${encodeURIComponent(tran_id)}`, req.url),
    303,
  );
}
