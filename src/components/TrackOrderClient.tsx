"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  PackageSearch,
  Check,
  XCircle,
  Truck,
  Copy,
} from "lucide-react";
import { trackOrderAction, PublicOrder } from "@/lib/actions/track";
import {
  PUBLIC_STAGES,
  publicStageIndex,
} from "@/lib/order-status";
import { formatPrice } from "@/lib/format";
import { normalizeBDLocalPhone, isValidBDLocalPhone } from "@/lib/phone";

function whenText(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Timeline({ order }: { order: PublicOrder }) {
  // Cancelled is not a point on the ladder, so the ladder isn't drawn.
  if (order.stage === null) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800 text-sm">Order cancelled</p>
          <p className="text-xs text-red-700 mt-0.5">
            This order was cancelled. Call us if that looks wrong.
          </p>
        </div>
      </div>
    );
  }

  const current = publicStageIndex(order.stage);

  return (
    <ol className="relative">
      {PUBLIC_STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === PUBLIC_STAGES.length - 1;

        return (
          <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector, drawn behind the markers */}
            {!last && (
              <span
                aria-hidden
                className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${
                  done ? "bg-accent" : "bg-black/10"
                }`}
              />
            )}

            <span
              className={`relative z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                done
                  ? "bg-accent border-accent text-white"
                  : active
                    ? "bg-white border-accent text-accent"
                    : "bg-white border-black/15 text-black/25"
              }`}
            >
              {done ? (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full ${
                    active ? "bg-accent animate-pulse" : "bg-black/20"
                  }`}
                />
              )}
            </span>

            <div className="min-w-0 pt-0.5">
              <p
                className={`text-sm font-semibold ${
                  done || active ? "text-ink" : "text-black/35"
                }`}
              >
                {stage.label}
              </p>
              {(active || done) && (
                <p className="text-xs text-black/60 mt-0.5">{stage.blurb}</p>
              )}

              {/* The courier code only means anything once it has shipped. */}
              {stage.key === "shipped" && active && order.trackingNumber && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-paper border border-black/10">
                  <Truck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-xs text-black/60">Tracking</span>
                  <span className="text-xs font-mono font-semibold text-ink break-all">
                    {order.trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(order.trackingNumber!)
                        .catch(() => {})
                    }
                    aria-label="Copy tracking number"
                    className="text-black/60 hover:text-accent transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function OrderCard({ order }: { order: PublicOrder }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white overflow-hidden">
      <div className="p-5 bg-paper border-b border-black/10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-mono text-sm font-bold text-ink break-all">
            {order.tranId}
          </span>
          <span className="text-xs text-black/60">
            Placed {whenText(order.placedAt)}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          {order.items.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className="flex justify-between gap-4 text-sm text-black/70"
            >
              <span className="min-w-0">
                {item.name} × {item.qty}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-black/10 flex justify-between text-sm">
          <span className="font-semibold text-ink">Total</span>
          <span className="font-display text-lg text-ink">
            {formatPrice(order.totalAmountCents)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <Timeline order={order} />
      </div>
    </div>
  );
}

export default function TrackOrderClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PublicOrder[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setOrders(null);
    try {
      // A phone number goes over in the same shape the order was stored
      // in, so a customer typing +8801… or Bangla numerals still matches.
      const phone = normalizeBDLocalPhone(trimmed);
      const res = await trackOrderAction(
        isValidBDLocalPhone(phone) ? phone : trimmed,
      );
      if (res.success) setOrders(res.orders);
      else setError(res.error);
    } catch {
      setError("Couldn't look that up. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl tracking-wide mb-2">TRACK ORDER</h1>
      <p className="text-sm text-black/60 mb-8">
        Enter the order ID from your confirmation, or the phone number you
        ordered with.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-black/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="KZ-xxxxxxxx-xxxxxxxx  or  01XXXXXXXXX"
            aria-label="Order ID or phone number"
            autoComplete="off"
            className="w-full border border-black/15 rounded pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-display tracking-wide px-6 py-2.5 rounded cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PackageSearch className="w-4 h-4" />
          )}
          <span>TRACK</span>
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-8 flex flex-col gap-5">
          {orders.length > 1 && (
            <p className="text-xs text-black/60">
              {orders.length} recent orders for that number, newest first.
            </p>
          )}
          {orders.map((order) => (
            <OrderCard key={order.tranId} order={order} />
          ))}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-black/10 text-xs text-black/45">
        <p>
          Can&apos;t find your order? The ID is in the confirmation you saw
          after checkout, and looks like{" "}
          <span className="font-mono">KZ-xxxxxxxx-xxxxxxxx</span>. You can also
          search with the phone number you gave us.
        </p>
        <p className="mt-2">
          <Link href="/products" className="text-accent hover:underline">
            Keep shopping
          </Link>
        </p>
      </div>
    </div>
  );
}
