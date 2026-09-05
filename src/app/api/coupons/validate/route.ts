import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateCouponForCheckout } from "@/lib/coupons";

const schema = z.object({
  code: z.string().min(1, "Enter a coupon code."),
  subtotalCents: z.number().int().min(0, "Invalid subtotal amount."),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const result = await validateCouponForCheckout(
      parsed.data.code,
      parsed.data.subtotalCents,
    );

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error || "Coupon could not be applied." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      coupon: result.coupon,
    });
  } catch (error) {
    console.error("API /api/coupons/validate error:", error);
    return NextResponse.json(
      { valid: false, error: "Unable to validate coupon right now." },
      { status: 500 },
    );
  }
}
