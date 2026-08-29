"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

function OrderReference() {
  const tran_id = useSearchParams().get("tran_id");
  if (!tran_id) return null;
  return <p className="text-black/40 text-xs mb-8">Order reference: {tran_id}</p>;
}

export default function CheckoutSuccessPage() {
  const clear = useCartStore((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <CheckCircle2 className="mx-auto text-accent mb-4" size={48} />
      <h1 className="font-display text-4xl tracking-wide mb-4">
        ORDER CONFIRMED
      </h1>
      <p className="text-black/60 mb-4">
        Thanks for your order. A confirmation email is on its way — your
        machines will ship soon.
      </p>
      <Suspense fallback={null}>
        <OrderReference />
      </Suspense>
      <Link
        href="/products"
        className="inline-block bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide px-8 py-3 rounded"
      >
        KEEP SHOPPING
      </Link>
    </div>
  );
}
