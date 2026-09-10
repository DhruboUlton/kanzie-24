"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, Tag, X } from "lucide-react";
import { CartItem, useCartStore, cartTotalCents, takeBuyNowItem } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import {
  BD_DIAL_CODE,
  BD_LOCAL_LENGTH,
  isValidBDLocalPhone,
  normalizeBDLocalPhone,
} from "@/lib/phone";

type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

type AppliedCoupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmountCents: number;
  finalSubtotalCents: number;
  /**
   * The cart subtotal this discount was priced against. A percentage coupon
   * is worth a different amount the moment the cart changes, and the cart
   * drawer is reachable from this page, so the figure on screen has to be
   * re-checked against the live subtotal rather than trusted once.
   */
  pricedAtSubtotalCents: number;
};

// Full recap shown once an order is submitted — items, final total, and
// exactly where/who it's shipping to — so the customer can see what they
// committed to while it's processing, not just a spinner.
function OrderRecap({
  items,
  total,
  discountAmountCents = 0,
  couponCode,
  customer,
}: {
  items: CartItem[];
  total: number;
  discountAmountCents?: number;
  couponCode?: string | null;
  customer: Customer;
}) {
  const finalTotal = Math.max(0, total - discountAmountCents);

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

      <div className="border-t border-black/10 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-black/70">
          <span>Subtotal</span>
          <span>{formatPrice(total)}</span>
        </div>

        {discountAmountCents > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Coupon ({couponCode})</span>
            </span>
            <span>-{formatPrice(discountAmountCents)}</span>
          </div>
        )}

        <div className="flex justify-between font-display text-lg tracking-wide border-t border-black/10 pt-3 text-ink">
          <span>TOTAL</span>
          <span>{formatPrice(finalTotal)}</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-black/10 text-sm space-y-1">
        <p className="font-display text-xs tracking-wide text-black/60 mb-2">
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

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Snapshot of what was actually submitted — clearCart() on success empties
  // the live cart items, so the recap on the processing/success/error
  // screens reads from here instead of the (by then possibly empty) live
  // cart derivation below.
  const [submitted, setSubmitted] = useState<{
    items: CartItem[];
    total: number;
    discountAmountCents: number;
    couponCode: string | null;
  } | null>(null);
  const [revalidatingCoupon, setRevalidatingCoupon] = useState(false);

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
  const items = buyNowItem ? [buyNowItem] : cartItems;
  const subtotal = cartTotalCents(items);

  // Re-prices an applied coupon against the live subtotal. The server is the
  // authority on the discount either way, so leaving a stale figure on screen
  // only means showing the customer a total the order will not match — a 20%
  // coupon applied to a ৳10,000 cart is worth ৳4,000 once that cart doubles.
  const appliedCode = appliedCoupon?.code ?? null;
  const pricedAt = appliedCoupon?.pricedAtSubtotalCents ?? null;

  useEffect(() => {
    if (!appliedCode || pricedAt === null || pricedAt === subtotal) return;

    let abandoned = false;
    setRevalidatingCoupon(true);

    (async () => {
      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: appliedCode, subtotalCents: subtotal }),
        });
        const data = await res.json();
        if (abandoned) return;

        if (!res.ok || !data.valid) {
          // Most often the cart has dropped below the coupon's minimum order.
          setAppliedCoupon(null);
          setCouponCodeInput(appliedCode);
          setCouponError(
            data.error ||
              "Your cart changed and this coupon no longer applies. Try applying it again.",
          );
        } else {
          setAppliedCoupon({ ...data.coupon, pricedAtSubtotalCents: subtotal });
        }
      } catch {
        // Offline mid-edit: drop the stale figure rather than show a total
        // the order will not honour.
        if (!abandoned) {
          setAppliedCoupon(null);
          setCouponCodeInput(appliedCode);
          setCouponError("Couldn't re-check your coupon. Please apply it again.");
        }
      } finally {
        if (!abandoned) setRevalidatingCoupon(false);
      }
    })();

    return () => {
      abandoned = true;
    };
  }, [appliedCode, pricedAt, subtotal]);

  if (buyNowItem === undefined) return null;

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmountCents : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  function updateField(field: keyof Customer) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setCustomer((c) => ({ ...c, [field]: e.target.value }));
  }

  // The phone field never holds what was literally typed. Bangla numerals
  // are folded to ASCII and a pasted +88/88 prefix is stripped, so the value
  // is always the local 01XXXXXXXXX form the rest of the system expects.
  function updatePhone(e: React.ChangeEvent<HTMLInputElement>) {
    const next = normalizeBDLocalPhone(e.target.value);
    setCustomer((c) => ({ ...c, phone: next }));
  }

  async function handleApplyCoupon(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const code = couponCodeInput.trim();
    if (!code) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotalCents: subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Coupon could not be applied.");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ ...data.coupon, pricedAtSubtotalCents: subtotal });
        setCouponError(null);
      }
    } catch {
      setCouponError("Unable to validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponCodeInput("");
  }

  async function handleCheckout() {
    setSubmitted({
      items,
      total: subtotal,
      discountAmountCents: discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
    });
    setStage("processing");
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
          customer,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
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
      // Replace the browser's arithmetic with what was actually written, so
      // the confirmation can never quote a total the order does not hold.
      if (typeof data.totalAmountCents === "number") {
        setSubmitted({
          items,
          total: data.subtotalCents,
          discountAmountCents: data.discountAmountCents ?? 0,
          couponCode: data.couponCode ?? null,
        });
      }
      clearCart();
      setStage("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("error");
    }
  }

  const recapItems = submitted?.items ?? items;
  const recapTotal = submitted?.total ?? subtotal;
  const recapDiscount = submitted?.discountAmountCents ?? discountAmount;
  const recapCouponCode = submitted?.couponCode ?? appliedCoupon?.code;

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
        <p className="text-sm text-black/60 mb-8">
          Please don&apos;t close or refresh this page.
        </p>
        <OrderRecap
          items={recapItems}
          total={recapTotal}
          discountAmountCents={recapDiscount}
          couponCode={recapCouponCode}
          customer={customer}
        />
      </div>
    );
  }

  if (stage === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        {/* Green, not brand red: this is the one moment on the storefront
            that has to read as "it worked", and red reads as an error. */}
        <CheckCircle2 className="w-10 h-10 mx-auto mb-5 text-emerald-600" />
        <h1 className="font-display text-3xl tracking-wide mb-2">
          ORDER PLACED
        </h1>
        {orderId && (
          <p className="font-mono text-sm text-black/60 mb-2">
            Order ID: <span className="font-bold text-ink">{orderId}</span>
          </p>
        )}
        <p className="text-base text-black/70 mb-8 max-w-md mx-auto">
          One of our team will call{" "}
          <span className="font-semibold text-ink">{customer.phone}</span> shortly
          to confirm your order before it ships.
        </p>
        <OrderRecap
          items={recapItems}
          total={recapTotal}
          discountAmountCents={recapDiscount}
          couponCode={recapCouponCode}
          customer={customer}
        />
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
        <OrderRecap
          items={recapItems}
          total={recapTotal}
          discountAmountCents={recapDiscount}
          couponCode={recapCouponCode}
          customer={customer}
        />
        <button
          onClick={() => setStage("form")}
          className="mt-6 w-full bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide py-3.5 rounded"
        >
          EDIT ORDER
        </button>
      </div>
    );
  }

  const phoneValid = isValidBDLocalPhone(customer.phone);
  // Shown only once they have typed enough to be wrong, so the field isn't
  // scolding someone who is still halfway through it.
  const phoneLooksWrong = customer.phone.length >= BD_LOCAL_LENGTH && !phoneValid;
  const customerComplete =
    Object.values(customer).every((v) => v.trim().length > 0) && phoneValid;

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

        {/* Coupon Code Section */}
        <div className="border-t border-black/10 pt-4 pb-4">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-mono font-bold text-xs text-emerald-800 tracking-wider">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-xs text-emerald-600 ml-2">
                    ({appliedCoupon.discountType === "PERCENTAGE"
                      ? `${appliedCoupon.discountValue}% off`
                      : `${formatPrice(appliedCoupon.discountValue)} off`})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-emerald-700 hover:text-emerald-900 p-1 hover:bg-emerald-100 rounded transition-colors"
                title="Remove coupon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60" />
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. SALE20)"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/15 rounded focus:outline-none focus:border-accent uppercase font-mono placeholder:normal-case placeholder:font-sans"
                  />
                </div>
                <button
                  type="submit"
                  disabled={couponLoading || !couponCodeInput.trim()}
                  className="px-4 py-2 bg-ink text-white hover:bg-black disabled:opacity-50 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {couponLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Apply</span>
                </button>
              </div>
              {couponError && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{couponError}</span>
                </p>
              )}
            </form>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-2 border-t border-black/10 pt-4 text-sm">
          <div className="flex justify-between text-black/70">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          {appliedCoupon && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span className="flex items-center gap-1">
                <span>Discount</span>
                <span className="text-xs font-mono">({appliedCoupon.code})</span>
              </span>
              <span className={revalidatingCoupon ? "opacity-50" : undefined}>
                -{formatPrice(appliedCoupon.discountAmountCents)}
              </span>
            </div>
          )}

          <div className="flex justify-between font-display text-lg tracking-wide border-t border-black/10 pt-3 text-ink">
            <span>TOTAL</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>
        </div>

        <p className="text-xs text-black/60 mt-2">
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
          <div>
            <div
              // Same border, radius and (transparent) background as every
              // other field in this card — the prefix is the only thing that
              // should look different, not the input itself.
              className={`flex items-stretch rounded border overflow-hidden ${
                phoneLooksWrong ? "border-red-400" : "border-black/15"
              }`}
            >
              {/* Fixed, not typed: the country code is the same for every
                  customer, and leaving it editable is how numbers arrive as
                  +8801… that then fail the courier lookups. */}
              <span className="flex items-center pl-3 pr-2.5 py-2 text-sm text-black/45 border-r border-black/10 select-none">
                {BD_DIAL_CODE}
              </span>
              <input
                type="tel"
                // Latin digits only: inputMode="numeric" gets the numeric
                // keypad rather than the Bangla letter keyboard, and
                // normalizeBDLocalPhone folds anything else that arrives.
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="[0-9]*"
                // Deliberately no maxLength: the browser would truncate the
                // raw string before onChange runs, so pasting
                // "+8801712345678" would lose its tail and then have its
                // country code stripped off the wrong digits.
                // normalizeBDLocalPhone caps the digits instead.
                placeholder="01XXXXXXXXX"
                value={customer.phone}
                onChange={updatePhone}
                aria-invalid={phoneLooksWrong}
                className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm outline-none"
              />
            </div>
            {phoneLooksWrong && (
              <p className="mt-1 text-xs text-red-600">
                Doesn&apos;t look like a Bangladeshi mobile number.
              </p>
            )}
          </div>
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
        disabled={!customerComplete || revalidatingCoupon}
        className="mt-6 w-full bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-white font-display tracking-wide py-3.5 rounded"
      >
        {revalidatingCoupon ? "UPDATING TOTAL…" : "CONFIRM ORDER"}
      </button>
      <p className="mt-3 text-xs text-black/60 text-center">
        No online payment — we&apos;ll call to confirm your order, then you pay
        cash on delivery.
      </p>
    </div>
  );
}
