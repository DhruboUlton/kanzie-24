"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CartItem, useCartStore, cartTotalCents, takeBuyNowItem } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

const ERROR_MESSAGES: Record<string, string> = {
  payment_failed: "Payment failed. Please try again.",
  payment_cancelled: "Payment was cancelled.",
  payment_not_verified: "We couldn't verify that payment. If you were charged, contact support.",
  invalid_response: "Something went wrong on the way back from the payment page. Please try again.",
};

function CheckoutError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;
  return (
    <p className="mb-4 text-sm text-accent-dark bg-accent/10 border border-accent/30 rounded px-4 py-3">
      {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
    </p>
  );
}

export default function CheckoutPage() {
  const cartItems = useCartStore((s) => s.items);
  const [buyNowItem, setBuyNowItemState] = useState<CartItem | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  // Read once on mount — a "buy now" click stashes a single item here so
  // checkout can total just that item without touching the persisted cart.
  // takeBuyNowItem() deletes the key as it reads it, so the ref guard
  // matters: StrictMode double-invokes this effect in dev, and without it
  // the second call finds the key already gone and overwrites the item
  // with null.
  const consumedRef = useRef(false);
  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    setBuyNowItemState(takeBuyNowItem());
  }, []);

  // undefined = still checking sessionStorage; render nothing until then so
  // a real cart doesn't flash "nothing to check out" first.
  if (buyNowItem === undefined) return null;

  const items = buyNowItem ? [buyNowItem] : cartItems;
  const total = cartTotalCents(items);

  function updateField(field: keyof typeof customer) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setCustomer((c) => ({ ...c, [field]: e.target.value }));
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
          customer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl tracking-wide mb-4">
          NOTHING TO CHECK OUT
        </h1>
        <Link href="/products" className="text-accent font-semibold">
          Shop the collection →
        </Link>
      </div>
    );
  }

  const customerComplete = Object.values(customer).every((v) => v.trim().length > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl tracking-wide mb-8">CHECKOUT</h1>

      <Suspense fallback={null}>
        <CheckoutError />
      </Suspense>

      <div className="bg-paper rounded-lg p-6 mb-6">
        <h2 className="font-display text-lg tracking-wide mb-4">
          ORDER SUMMARY
        </h2>
        <div className="flex flex-col gap-2 mb-4">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.qty}
              </span>
              <span>{formatPrice(item.priceCents * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-display text-lg tracking-wide border-t border-black/10 pt-4">
          <span>SUBTOTAL</span>
          <span>{formatPrice(total)}</span>
        </div>
        <p className="text-xs text-black/50 mt-1">
          Shipping & taxes calculated on the next step.
        </p>
      </div>

      <div className="bg-paper rounded-lg p-6">
        <h2 className="font-display text-lg tracking-wide mb-4">
          DELIVERY DETAILS
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full name"
            value={customer.name}
            onChange={updateField("name")}
            className="border border-black/15 rounded px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="email"
            placeholder="Email"
            value={customer.email}
            onChange={updateField("email")}
            className="border border-black/15 rounded px-3 py-2 text-sm"
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={customer.phone}
            onChange={updateField("phone")}
            className="border border-black/15 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Address"
            value={customer.address}
            onChange={updateField("address")}
            className="border border-black/15 rounded px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="text"
            placeholder="City"
            value={customer.city}
            onChange={updateField("city")}
            className="border border-black/15 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-accent-dark bg-accent/10 border border-accent/30 rounded px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading || !customerComplete}
        className="mt-6 w-full bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-white font-display tracking-wide py-3.5 rounded"
      >
        {loading ? "REDIRECTING…" : "PAY NOW"}
      </button>
      <p className="mt-3 text-xs text-black/40 text-center">
        You&apos;ll pay via bKash, Nagad, Rocket, card, or bank transfer on
        SSLCommerz&apos;s secure checkout page.
      </p>
    </div>
  );
}
