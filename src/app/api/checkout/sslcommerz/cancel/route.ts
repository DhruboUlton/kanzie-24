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
          status: "CANCELLED",
          events: {
            create: {
              status: "CANCELLED",
              note: "Customer cancelled payment at checkout gateway",
            },
          },
        },
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.redirect(
    new URL("/checkout?error=payment_cancelled", req.url),
    303,
  );
}
