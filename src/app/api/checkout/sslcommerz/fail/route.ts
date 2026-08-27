import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.redirect(
    new URL("/checkout?error=payment_failed", req.url),
    303,
  );
}
