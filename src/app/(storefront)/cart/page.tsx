"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, cartTotalCents } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = cartTotalCents(items);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl tracking-wide mb-4">
          YOUR CART IS EMPTY
        </h1>
        <Link href="/products" className="text-accent font-semibold">
          Shop the collection →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-4xl tracking-wide mb-10">
        YOUR CART
      </h1>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* min-w-0: a grid item's default min-width is its min-content, so the
            item row's controls pushed this column past the viewport and the
            whole page scrolled sideways on a 320px screen. */}
        <div className="lg:col-span-2 min-w-0 flex flex-col gap-6">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 pb-6 border-b border-black/10"
            >
              <div className="w-24 h-24 shrink-0 bg-paper rounded overflow-hidden relative">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display tracking-wide text-lg">
                    {item.name}
                  </span>
                  {item.combo && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                      {item.combo.discountPercent}% OFF
                    </span>
                  )}
                </div>

                {item.combo && (
                  <div className="mt-1.5 text-xs text-black/60 space-y-0.5">
                    {item.combo.items.map((sub, sIdx) => (
                      <div key={sIdx}>
                        &bull; {sub.name}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-accent font-semibold text-base font-mono">
                    {formatPrice(item.priceCents)}
                  </span>
                  {item.combo && item.combo.originalTotalCents > item.priceCents && (
                    <span className="text-xs text-black/40 line-through font-mono">
                      {formatPrice(item.combo.originalTotalCents)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center border border-black/15 rounded">
                    <button
                      className="p-2"
                      aria-label="Decrease quantity"
                      onClick={() => setQty(item.productId, item.qty - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm">
                      {item.qty}
                    </span>
                    <button
                      className="p-2"
                      aria-label="Increase quantity"
                      onClick={() => setQty(item.productId, item.qty + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    aria-label="Remove item"
                    className="text-black/60 hover:text-accent flex items-center gap-1 text-sm"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
              <p className="font-semibold">
                {formatPrice(item.priceCents * item.qty)}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-paper rounded-lg p-6 h-fit">
          <h2 className="font-display text-xl tracking-wide mb-4">
            ORDER SUMMARY
          </h2>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-black/60">Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <p className="text-xs text-black/60 mb-4">
            Shipping & taxes calculated at checkout.
          </p>
          <Link
            href="/checkout"
            className="block w-full text-center bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide py-3 rounded"
          >
            CHECKOUT
          </Link>
        </div>
      </div>
    </div>
  );
}
