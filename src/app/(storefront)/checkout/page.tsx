"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { CartItem, useCartStore, cartTotalCents, takeBuyNowItem } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

// Full recap shown once an order is submitted — items, final total, and
// exactly where/who it's shipping to — so the customer can see what they
// committed to while it's processing, not just a spinner.
function OrderRecap({
  items,
  total,
  customer,
}: {
  items: CartItem[];
  total: number;
  customer: Customer;
}) {
  return (
    <div className="bg-paper rounded-lg p-6 text-left">
      <h2 className="font-display text-lg tracking-wide mb-4">ORDER SUMMARY</h2>
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
        <span>TOTAL</span>
        <span>{formatPrice(total)}</span>
      </div>

      <div className="mt-6 pt-6 border-t border-black/10 text-sm space-y-1">
        <p className="font-display text-xs tracking-wide text-black/40 mb-2">
          DELIVERING TO
        </p>
        <p className="font-semibold">{customer.name}</p>
        <p className="text-black/70">
          {customer.address}, {customer.city}
        </p>
        <p className="text-black/70">
          {customer.phone} · {customer.email}
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const [buyNowItem, setBuyNowItemState] = useState<CartItem | null | undefined>(
    undefined,
  );
  const [stage, setStage] = useState<"form" | "processing" | "success" | "error">(
    "form",
  );
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Snapshot of what was actually submitted — clearCart() on success empties
  // the live cart items, so the recap on the processing/success/error
  // screens reads from here instead of the (by then possibly empty) live
  // cart derivation below.
  const [submitted, setSubmitted] = useState<{ items: CartItem[]; total: number } | null>(
    null,
  );
  const [customer, setCustomer] = useState<Customer>({
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

  function updateField(field: keyof Customer) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setCustomer((c) => ({ ...c, [field]: e.target.value }));
  }

  async function handleCheckout() {
    setSubmitted({ items, total });
    setStage("processing");
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
        setStage("error");
        return;
      }
      // No payment gateway — the order is placed and awaiting a
      // confirmation call, not a redirect. Clear the cart now that it's
      // been recorded (a no-op for a "buy now" purchase, which never
      // touched the persisted cart).
      setOrderId(data.orderId);
      clearCart();
      setStage("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("error");
    }
  }

  const recapItems = submitted?.items ?? items;
  const recapTotal = submitted?.total ?? total;

  if (items.length === 0 && stage === "form") {
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

  if (stage === "processing") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-5 text-accent animate-spin" />
        <h1 className="font-display text-3xl tracking-wide mb-2">
          PROCESSING YOUR ORDER
        </h1>
        <p className="text-sm text-black/50 mb-8">
          Please don&apos;t close or refresh this page.
        </p>
        <OrderRecap items={recapItems} total={recapTotal} customer={customer} />
      </div>
    );
  }

  if (stage === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-5 text-accent" />
        <h1 className="font-display text-3xl tracking-wide mb-2">
          ORDER PLACED
        </h1>
        {orderId && (
          <p className="font-mono text-sm text-black/50 mb-2">
            Order ID: <span className="font-bold text-ink">{orderId}</span>
          </p>
        )}
        <p className="text-sm text-black/60 mb-8 max-w-md mx-auto">
          We don&apos;t take payment online — one of our team will call{" "}
          <span className="font-semibold text-ink">{customer.phone}</span> shortly
          to confirm your order before it ships. Payment is cash on delivery.
        </p>
        <OrderRecap items={recapItems} total={recapTotal} customer={customer} />
        <Link
          href="/products"
          className="mt-6 inline-block bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide px-8 py-3.5 rounded"
        >
          KEEP SHOPPING
        </Link>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-5 text-accent" />
        <h1 className="font-display text-3xl tracking-wide mb-2">
          COULDN&apos;T PLACE YOUR ORDER
        </h1>
        <p className="inline-block text-sm text-accent-dark bg-accent/10 border border-accent/30 rounded px-4 py-3 mb-8">
          {error}
        </p>
        <OrderRecap items={recapItems} total={recapTotal} customer={customer} />
        <button
          onClick={() => setStage("form")}
          className="mt-6 w-full bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide py-3.5 rounded"
        >
          EDIT ORDER
        </button>
      </div>
    );
  }

  const customerComplete = Object.values(customer).every((v) => v.trim().length > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl tracking-wide mb-8">CHECKOUT</h1>

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

      <button
        onClick={handleCheckout}
        disabled={!customerComplete}
        className="mt-6 w-full bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-white font-display tracking-wide py-3.5 rounded"
      >
        CONFIRM ORDER
      </button>
      <p className="mt-3 text-xs text-black/40 text-center">
        No online payment — we&apos;ll call to confirm your order, then you pay
        cash on delivery.
      </p>
    </div>
  );
}
