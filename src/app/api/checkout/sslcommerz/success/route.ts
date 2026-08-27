import { NextRequest, NextResponse } from "next/server";
import { validateSSLCommerzPayment } from "@/lib/sslcommerz";

// SSLCommerz redirects the browser here with a POST after payment.
// val_id alone (from the redirect) is user-controlled and not proof of
// payment — always confirm server-to-server before treating it as paid.
export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const val_id = formData?.get("val_id");
  const tran_id = formData?.get("tran_id");

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
