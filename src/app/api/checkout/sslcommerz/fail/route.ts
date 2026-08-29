import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const tran_id = formData?.get("tran_id");

  if (typeof tran_id === "string") {
    try {
      await db.order.update({
        where: { tranId: tran_id },
        data: {
          status: "FAILED",
          events: {
            create: {
              status: "FAILED",
              note: "Payment failed or was declined by gateway",
            },
          },
        },
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.redirect(
    new URL("/checkout?error=payment_failed", req.url),
    303,
  );
}
