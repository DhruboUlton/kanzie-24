"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Tag,
  X,
  ChevronDown,
  ShoppingBag,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import {
  CartItem,
  useCartStore,
  cartTotalCents,
  takeBuyNowItem,
} from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import {
  BD_DIAL_CODE,
  BD_LOCAL_LENGTH,
  isValidBDLocalPhone,
  normalizeBDLocalPhone,
} from "@/lib/phone";
import {
  DEFAULT_SHIPPING_METHOD,
  SHIPPING_RATES,
  isShippingMethod,
  type ShippingMethod,
} from "@/lib/shipping";

type AppliedCoupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmountCents: number;
  finalSubtotalCents: number;
  pricedAtSubtotalCents: number;
};


const LOCAL_STORAGE_KEY = "kanzie_checkout_customer";

function OrderRecap({
  items,
  subtotalCents,
  shippingFeeCents,
  discountAmountCents = 0,
  couponCode,
  customerName,
  customerPhone,
  customerAddress,
  customerCity,
  shippingMethod,
}: {
  items: CartItem[];
  subtotalCents: number;
  shippingFeeCents: number;
  discountAmountCents?: number;
  couponCode?: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  shippingMethod: ShippingMethod;
}) {
  const finalTotal = Math.max(0, subtotalCents - discountAmountCents + shippingFeeCents);

  return (
    <div className="bg-paper/40 border border-black/10 rounded-xl p-6 text-left">
      <h2 className="font-display text-lg tracking-wide mb-4 text-ink">ORDER SUMMARY</h2>
      <div className="flex flex-col gap-3 mb-5">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-md bg-stone-100 border border-black/10 overflow-hidden shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-200 text-black/30">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-ink line-clamp-1">{item.name}</p>
                <p className="text-xs text-black/55">Qty: {item.qty}</p>
              </div>
            </div>
            <span className="font-mono font-medium text-ink">
              {formatPrice(item.priceCents * item.qty)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-black/10 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-black/70">
          <span>Subtotal</span>
          <span className="font-mono">{formatPrice(subtotalCents)}</span>
        </div>

        <div className="flex justify-between text-black/70">
          <span>
            Shipping ({SHIPPING_RATES[shippingMethod].labelEn} · {SHIPPING_RATES[shippingMethod].labelBn})
          </span>
          <span className="font-mono">{formatPrice(shippingFeeCents)}</span>
        </div>

        {discountAmountCents > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Coupon ({couponCode})</span>
            </span>
            <span className="font-mono">-{formatPrice(discountAmountCents)}</span>
          </div>
        )}

        <div className="flex justify-between font-display text-lg tracking-wide border-t border-black/10 pt-3 text-ink">
          <span>TOTAL</span>
          <span className="font-mono font-bold">{formatPrice(finalTotal)}</span>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-black/10 text-sm space-y-1">
        <p className="font-display text-xs tracking-wider text-black/55 mb-2 uppercase">
          Shipping & Payment
        </p>
        <p className="font-semibold text-ink">{customerName}</p>
        <p className="text-black/75">
          {customerAddress}, {customerCity}
        </p>
        <p className="text-black/75 font-mono">{customerPhone}</p>
        <p className="text-xs text-black/60 pt-1">
          Payment: <span className="font-semibold text-ink">Cash On Delivery</span> (ক্যাশ অন ডেলিভারী)
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const [buyNowItem, setBuyNowItemState] = useState<CartItem | null | undefined>(undefined);
  const [stage, setStage] = useState<"form" | "processing" | "success" | "error">("form");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [country] = useState("Bangladesh");
  const [optionalName, setOptionalName] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [saveInfo, setSaveInfo] = useState(true);

  // Shipping & Billing
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>(DEFAULT_SHIPPING_METHOD);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [revalidatingCoupon, setRevalidatingCoupon] = useState(false);

  // UI helpers
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [showPhoneHelp, setShowPhoneHelp] = useState(false);

  // Submitted snapshot
  const [submitted, setSubmitted] = useState<{
    items: CartItem[];
    subtotalCents: number;
    shippingFeeCents: number;
    discountAmountCents: number;
    couponCode: string | null;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    shippingMethod: ShippingMethod;
  } | null>(null);

  // Buy Now item check
  const consumedRef = useRef(false);
  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    setBuyNowItemState(takeBuyNowItem());
  }, []);

  // Load saved contact info from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.optionalName) setOptionalName(data.optionalName);
        if (data.name) setName(data.name);
        if (data.address) setAddress(data.address);
        if (data.city) setCity(data.city);
        if (data.postalCode) setPostalCode(data.postalCode);
        if (data.phone) setPhone(data.phone);
        // Validated, not cast: a saved value naming a rate that no longer
        // exists used to be indexed straight into SHIPPING_RATES and crash
        // the page on render.
        if (isShippingMethod(data.shippingMethod)) {
          setShippingMethod(data.shippingMethod);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const items = buyNowItem ? [buyNowItem] : cartItems;
  const subtotal = cartTotalCents(items);
  const shippingFee = SHIPPING_RATES[shippingMethod].cents;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmountCents : 0;
  const finalGrandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  // Revalidating coupon when subtotal shifts
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

  function updatePhone(e: React.ChangeEvent<HTMLInputElement>) {
    setPhoneTouched(true);
    const next = normalizeBDLocalPhone(e.target.value);
    setPhone(next);
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

  const phoneValid = isValidBDLocalPhone(phone);
  const phoneLooksWrong = phoneTouched && phone.length >= BD_LOCAL_LENGTH && !phoneValid;
  const fullName = [optionalName.trim(), name.trim()].filter(Boolean).join(" ");
  const isFormValid =
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    phoneValid;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || revalidatingCoupon) return;

    // Save info if requested
    if (saveInfo) {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            optionalName,
            name,
            address,
            city,
            postalCode,
            phone,
            shippingMethod,
          }),
        );
      } catch {
        // Ignore storage write errors
      }
    } else {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }

    const fullAddress = postalCode.trim()
      ? `${address.trim()} (Postal code: ${postalCode.trim()})`
      : address.trim();

    setSubmitted({
      items,
      subtotalCents: subtotal,
      shippingFeeCents: shippingFee,
      discountAmountCents: discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      customerName: fullName,
      customerPhone: phone,
      customerAddress: fullAddress,
      customerCity: city.trim(),
      shippingMethod,
    });

    setStage("processing");
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
          customer: {
            name: fullName,
            phone,
            address: fullAddress,
            city: city.trim(),
            postalCode: postalCode.trim() || undefined,
          },
          shippingMethod,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStage("error");
        return;
      }

      setOrderId(data.orderId);
      if (typeof data.totalAmountCents === "number") {
        setSubmitted({
          items,
          subtotalCents: data.subtotalCents,
          shippingFeeCents: data.shippingAmountCents ?? shippingFee,
          discountAmountCents: data.discountAmountCents ?? 0,
          couponCode: data.couponCode ?? null,
          customerName: fullName,
          customerPhone: phone,
          customerAddress: fullAddress,
          customerCity: city.trim(),
          shippingMethod,
        });
      }

      clearCart();
      setStage("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("error");
    }
  }

  // Recap snapshot data for post-form views
  const recapItems = submitted?.items ?? items;
  const recapSubtotal = submitted?.subtotalCents ?? subtotal;
  const recapShipping = submitted?.shippingFeeCents ?? shippingFee;
  const recapDiscount = submitted?.discountAmountCents ?? discountAmount;
  const recapCouponCode = submitted?.couponCode ?? appliedCoupon?.code;
  const recapName = submitted?.customerName ?? fullName;
  const recapPhone = submitted?.customerPhone ?? phone;
  const recapAddress = submitted?.customerAddress ?? address;
  const recapCity = submitted?.customerCity ?? city;
  const recapShippingMethod = submitted?.shippingMethod ?? shippingMethod;

  if (items.length === 0 && stage === "form") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl tracking-wide mb-4 text-ink">
          NOTHING TO CHECK OUT
        </h1>
        <p className="text-black/60 mb-6 text-sm">
          Your cart is currently empty. Explore our collection of premium RC toys!
        </p>
        <Link
          href="/products"
          className="inline-block bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide px-8 py-3.5 rounded"
        >
          SHOP THE COLLECTION →
        </Link>
      </div>
    );
  }

  if (stage === "processing") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-5 text-accent animate-spin" />
        <h1 className="font-display text-3xl tracking-wide mb-2 text-ink">
          PROCESSING YOUR ORDER
        </h1>
        <p className="text-sm text-black/60 mb-8">
          Please don&apos;t close or refresh this page while we confirm your details.
        </p>
        <OrderRecap
          items={recapItems}
          subtotalCents={recapSubtotal}
          shippingFeeCents={recapShipping}
          discountAmountCents={recapDiscount}
          couponCode={recapCouponCode}
          customerName={recapName}
          customerPhone={recapPhone}
          customerAddress={recapAddress}
          customerCity={recapCity}
          shippingMethod={recapShippingMethod}
        />
      </div>
    );
  }

  if (stage === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide mb-2 text-ink">
          ORDER PLACED
        </h1>
        {orderId && (
          <p className="font-mono text-sm text-black/60 mb-2">
            Order ID: <span className="font-bold text-ink">{orderId}</span>
          </p>
        )}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-8 text-sm text-emerald-900 max-w-lg mx-auto">
          <p className="font-medium mb-1">
            After placing your order, it will be automatically confirmed.
          </p>
          <p className="text-emerald-800 text-xs">
            অর্ডারটি প্লেস করার সাথে সাথেই স্বয়ংক্রিয়ভাবে কনফার্ম হবে। Our team will call{" "}
            <span className="font-bold font-mono">{recapPhone}</span> before dispatch.
          </p>
        </div>
        <OrderRecap
          items={recapItems}
          subtotalCents={recapSubtotal}
          shippingFeeCents={recapShipping}
          discountAmountCents={recapDiscount}
          couponCode={recapCouponCode}
          customerName={recapName}
          customerPhone={recapPhone}
          customerAddress={recapAddress}
          customerCity={recapCity}
          shippingMethod={recapShippingMethod}
        />
        <Link
          href="/products"
          className="mt-8 inline-block bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide px-8 py-3.5 rounded shadow-sm"
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
        <h1 className="font-display text-3xl tracking-wide mb-2 text-ink">
          COULDN&apos;T PLACE YOUR ORDER
        </h1>
        <p className="inline-block text-sm text-accent-dark bg-accent/10 border border-accent/30 rounded px-4 py-3 mb-8">
          {error}
        </p>
        <OrderRecap
          items={recapItems}
          subtotalCents={recapSubtotal}
          shippingFeeCents={recapShipping}
          discountAmountCents={recapDiscount}
          couponCode={recapCouponCode}
          customerName={recapName}
          customerPhone={recapPhone}
          customerAddress={recapAddress}
          customerCity={recapCity}
          shippingMethod={recapShippingMethod}
        />
        <button
          onClick={() => setStage("form")}
          className="mt-6 w-full bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide py-3.5 rounded"
        >
          EDIT ORDER & TRY AGAIN
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Mobile Top Order Summary Bar */}
      <div className="lg:hidden border-b border-black/10 bg-[#faf9f6]">
        <div className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-ink">
          <div className="flex items-center gap-2 text-accent font-medium">
            <ShoppingBag className="w-4 h-4" />
            <span>Order summary</span>
          </div>
          <span className="font-mono font-bold text-ink">
            {formatPrice(finalGrandTotal)}
          </span>
        </div>

        <div className="px-4 py-5 border-t border-black/10 bg-white/70 space-y-4">
            {/* Items list */}
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-lg bg-stone-100 border border-black/10 overflow-hidden shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-200">
                          <ShoppingBag className="w-6 h-6 text-black/30" />
                        </div>
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/80 text-white text-[11px] font-bold rounded-full flex items-center justify-center z-10 shadow-sm">
                        {item.qty}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-xs text-ink line-clamp-1">{item.name}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-ink">
                    {formatPrice(item.priceCents * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Mobile */}
            <div className="pt-3 border-t border-black/10">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded px-3 py-2 text-xs">
                  <span className="font-mono font-bold text-emerald-800">
                    {appliedCoupon.code} (-{formatPrice(appliedCoupon.discountAmountCents)})
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-emerald-700 hover:text-emerald-900"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Discount code or gift card"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 text-xs border border-black/20 rounded focus:outline-none focus:border-accent uppercase font-mono"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponCodeInput.trim()}
                    className="px-4 py-2 bg-ink text-white hover:bg-black text-xs font-medium rounded transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? "…" : "Apply"}
                  </button>
                </form>
              )}
            </div>

            {/* Breakdown Mobile */}
            <div className="pt-3 border-t border-black/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-black/70">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-black/70">
                <span>Shipping</span>
                <span className="font-mono">{formatPrice(shippingFee)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-mono">-{formatPrice(appliedCoupon.discountAmountCents)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-ink pt-2 border-t border-black/10">
                <span>Total</span>
                <span className="font-mono">BDT {formatPrice(finalGrandTotal)}</span>
              </div>
            </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleCheckout} className="space-y-8">
              {/* Delivery Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-ink tracking-wide">
                    Delivery
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* Country/Region dropdown */}
                  <div className="relative">
                    <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                      Country/Region
                    </label>
                    <div className="relative">
                      <select
                        value={country}
                        disabled
                        className="w-full appearance-none bg-stone-50 border border-black/20 rounded px-3.5 py-2.5 text-sm text-ink font-medium focus:outline-none cursor-default"
                      >
                        <option value="Bangladesh">Bangladesh</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-black/50 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Name Fields: Optional Name & Name (নাম) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                        Optional Name
                      </label>
                      <input
                        type="text"
                        placeholder="Optional Name"
                        value={optionalName}
                        onChange={(e) => setOptionalName(e.target.value)}
                        className="w-full bg-white border border-black/20 rounded px-3.5 py-2.5 text-sm text-ink placeholder:text-black/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                        Name (নাম) <span className="text-accent">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Name (নাম)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white border border-black/20 rounded px-3.5 py-2.5 text-sm text-ink placeholder:text-black/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      />
                    </div>
                  </div>

                  {/* Address (ঠিকানা) */}
                  <div>
                    <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                      Address (ঠিকানা) <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Address (ঠিকানা)"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-white border border-black/20 rounded px-3.5 py-2.5 text-sm text-ink placeholder:text-black/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>

                  {/* City/District & Postal code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                        City/District (শহর/জেলা) <span className="text-accent">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="City/District (শহর/জেলা)"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-white border border-black/20 rounded px-3.5 py-2.5 text-sm text-ink placeholder:text-black/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                        Postal code (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Postal code (optional)"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full bg-white border border-black/20 rounded px-3.5 py-2.5 text-sm text-ink placeholder:text-black/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      />
                    </div>
                  </div>

                  {/* Mobile Number with helper tooltip */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider">
                        Mobile Number (মোবাইল নম্বর) <span className="text-accent">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPhoneHelp(!showPhoneHelp)}
                        className="text-black/40 hover:text-black/70 transition-colors inline-flex items-center"
                        title="Why mobile number is needed"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {showPhoneHelp && (
                      <div className="mb-2 p-2.5 bg-stone-50 border border-black/10 rounded text-xs text-black/70">
                        We will call this number to confirm your order and delivery address before shipping.
                      </div>
                    )}

                    <div
                      className={`flex items-stretch rounded border overflow-hidden bg-white transition-colors ${
                        phoneLooksWrong
                          ? "border-red-500 ring-1 ring-red-500"
                          : "border-black/20 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
                      }`}
                    >
                      <span className="flex items-center pl-3 pr-2.5 py-2.5 text-sm text-black/50 border-r border-black/10 select-none font-mono">
                        {BD_DIAL_CODE}
                      </span>
                      <input
                        type="tel"
                        required
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="01XXXXXXXXX"
                        value={phone}
                        onChange={updatePhone}
                        onBlur={() => setPhoneTouched(true)}
                        className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 text-sm text-ink placeholder:text-black/40 outline-none font-mono"
                      />
                    </div>

                    {phoneLooksWrong && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).</span>
                      </p>
                    )}
                  </div>

                  {/* Save info checkbox */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2.5 text-xs sm:text-sm text-ink cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveInfo}
                        onChange={(e) => setSaveInfo(e.target.checked)}
                        className="w-4 h-4 rounded border-black/20 text-accent focus:ring-accent accent-accent"
                      />
                      <span>Save this information for next time</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Shipping Method Section */}
              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-ink tracking-wide">
                  Shipping method
                </h2>

                <div className="border border-black/20 rounded-lg overflow-hidden divide-y divide-black/15 bg-white">
                  {/* Inside Dhaka */}
                  <label
                    onClick={() => setShippingMethod("inside_dhaka")}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                      shippingMethod === "inside_dhaka" ? "bg-stone-50/80" : "hover:bg-stone-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="shipping_method"
                          checked={shippingMethod === "inside_dhaka"}
                          onChange={() => setShippingMethod("inside_dhaka")}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            shippingMethod === "inside_dhaka"
                              ? "border-accent"
                              : "border-black/30"
                          }`}
                        >
                          {shippingMethod === "inside_dhaka" && (
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-ink">
                          Inside Dhaka (ঢাকার ভিতর)
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {formatPrice(SHIPPING_RATES.inside_dhaka.cents)}
                    </span>
                  </label>

                  {/* Outside Dhaka */}
                  <label
                    onClick={() => setShippingMethod("outside_dhaka")}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                      shippingMethod === "outside_dhaka" ? "bg-stone-50/80" : "hover:bg-stone-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="shipping_method"
                          checked={shippingMethod === "outside_dhaka"}
                          onChange={() => setShippingMethod("outside_dhaka")}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            shippingMethod === "outside_dhaka"
                              ? "border-accent"
                              : "border-black/30"
                          }`}
                        >
                          {shippingMethod === "outside_dhaka" && (
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-ink">
                          Outside Dhaka (ঢাকার বাহিরে)
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {formatPrice(SHIPPING_RATES.outside_dhaka.cents)}
                    </span>
                  </label>
                </div>
              </section>

              {/* Payment Section */}
              <section className="space-y-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-ink tracking-wide">
                    Payment
                  </h2>
                  <p className="text-xs text-black/55 mt-0.5">
                    All transactions are secure and encrypted.
                  </p>
                </div>

                <div className="border border-black/20 rounded-lg overflow-hidden bg-white">
                  {/* Cash On Delivery header */}
                  <div className="flex items-center justify-between p-4 bg-stone-50/80 border-b border-black/15">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-accent flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      </div>
                      <span className="text-sm font-semibold text-ink">
                        Cash On Delivery (ক্যাশ অন ডেলিভারী)
                      </span>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-black/40" />
                  </div>

                  {/* Cash On Delivery expanded notice */}
                  <div className="p-4 bg-white text-xs sm:text-sm text-black/75">
                    <p className="font-medium text-ink">
                      After placing the order our representative will call you to
                      confirm your order
                    </p>
                  </div>
                </div>
              </section>

              {/* Billing Address Section */}
              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-ink tracking-wide">
                  Billing address
                </h2>

                <div className="border border-black/20 rounded-lg overflow-hidden divide-y divide-black/15 bg-white">
                  <label
                    onClick={() => setBillingSameAsShipping(true)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                      billingSameAsShipping ? "bg-stone-50/80" : "hover:bg-stone-50/40"
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="billing_address"
                        checked={billingSameAsShipping}
                        onChange={() => setBillingSameAsShipping(true)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          billingSameAsShipping ? "border-accent" : "border-black/30"
                        }`}
                      >
                        {billingSameAsShipping && (
                          <div className="w-2 h-2 rounded-full bg-accent" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-ink">
                      Same as shipping address
                    </span>
                  </label>

                  <label
                    onClick={() => setBillingSameAsShipping(false)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                      !billingSameAsShipping ? "bg-stone-50/80" : "hover:bg-stone-50/40"
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="billing_address"
                        checked={!billingSameAsShipping}
                        onChange={() => setBillingSameAsShipping(false)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          !billingSameAsShipping ? "border-accent" : "border-black/30"
                        }`}
                      >
                        {!billingSameAsShipping && (
                          <div className="w-2 h-2 rounded-full bg-accent" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-ink">
                      Use a different billing address
                    </span>
                  </label>

                  {/* Different billing address form */}
                  {!billingSameAsShipping && (
                    <div className="p-4 bg-stone-50/40 space-y-3 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                          Billing Name
                        </label>
                        <input
                          type="text"
                          placeholder="Billing Name"
                          value={billingName}
                          onChange={(e) => setBillingName(e.target.value)}
                          className="w-full bg-white border border-black/20 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                          Billing Address
                        </label>
                        <input
                          type="text"
                          placeholder="Billing Address"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          className="w-full bg-white border border-black/20 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-black/60 uppercase tracking-wider mb-1">
                          Billing City
                        </label>
                        <input
                          type="text"
                          placeholder="Billing City"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          className="w-full bg-white border border-black/20 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Complete Order Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || revalidatingCoupon}
                  className="w-full bg-ink hover:bg-black text-white font-display text-base tracking-wider py-4 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                >
                  {revalidatingCoupon ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>UPDATING TOTAL…</span>
                    </>
                  ) : (
                    <span>Complete order</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary (Desktop Sticky) */}
          <div className="hidden lg:block lg:col-span-5 bg-[#faf9f6] border border-black/10 rounded-2xl p-6 lg:p-7 sticky top-6">
            {/* Items list */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-16 h-16 rounded-xl bg-white border border-black/10 overflow-hidden shrink-0 shadow-2xs">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-100">
                          <ShoppingBag className="w-6 h-6 text-black/30" />
                        </div>
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/85 text-white text-[11px] font-bold rounded-full flex items-center justify-center z-10 shadow-sm">
                        {item.qty}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-ink leading-snug line-clamp-2 uppercase">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-medium text-ink shrink-0">
                    {formatPrice(item.priceCents * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Discount code section */}
            <div className="mt-6 pt-5 border-t border-black/10">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-mono font-bold text-xs text-emerald-800 tracking-wider">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-xs text-emerald-600 ml-2">
                        (-{formatPrice(appliedCoupon.discountAmountCents)})
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
                      <input
                        type="text"
                        placeholder="Discount code or gift card"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-black/20 rounded-md focus:outline-none focus:border-accent uppercase font-mono placeholder:normal-case placeholder:font-sans placeholder:text-black/45"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponLoading || !couponCodeInput.trim()}
                      className="px-4 py-2.5 bg-black/10 hover:bg-black/20 text-ink disabled:opacity-40 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shrink-0"
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

            {/* Price Calculations */}
            <div className="mt-6 pt-5 border-t border-black/10 space-y-2.5 text-sm">
              <div className="flex justify-between text-black/70">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-black/70">
                <span>Shipping</span>
                <span className="font-mono">{formatPrice(shippingFee)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span className="flex items-center gap-1">
                    <span>Discount</span>
                    <span className="text-xs font-mono">({appliedCoupon.code})</span>
                  </span>
                  <span className="font-mono">
                    -{formatPrice(appliedCoupon.discountAmountCents)}
                  </span>
                </div>
              )}

              <div className="flex items-baseline justify-between font-display border-t border-black/10 pt-4 text-ink">
                <span className="text-base font-bold tracking-wide">Total</span>
                <div className="text-right">
                  <span className="text-xs text-black/55 mr-1.5 font-sans font-medium">
                    BDT
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tight">
                    {formatPrice(finalGrandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
