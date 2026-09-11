"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, cartTotalCents } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

export default function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = cartTotalCents(items);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-black/10">
          <h2 className="font-display text-xl tracking-wide">YOUR CART</h2>
          <button onClick={close} aria-label="Close cart" className="p-2">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-black/60 px-6 text-center">
            <p>Your cart is empty.</p>
            <Link
              href="/products"
              onClick={close}
              className="text-accent font-semibold"
            >
              Shop the collection →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4">
                  <div className="w-20 h-20 shrink-0 bg-paper rounded overflow-hidden relative">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-accent text-sm font-semibold mt-1">
                      {formatPrice(item.priceCents)}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-black/15 rounded">
                        <button
                          className="p-1.5"
                          aria-label="Decrease quantity"
                          onClick={() => setQty(item.productId, item.qty - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm">
                          {item.qty}
                        </span>
                        <button
                          className="p-1.5"
                          aria-label="Increase quantity"
                          onClick={() => setQty(item.productId, item.qty + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        aria-label="Remove item"
                        className="text-black/60 hover:text-accent"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-black/10 px-5 py-5 space-y-4">
              <div className="flex items-center justify-between font-display text-lg tracking-wide">
                <span>SUBTOTAL</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-black/60">
                Shipping & taxes calculated at checkout.
              </p>
              <Link
                href="/checkout"
                onClick={close}
                className="block w-full text-center bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide py-3 rounded"
              >
                CHECKOUT
              </Link>
              <Link
                href="/cart"
                onClick={close}
                className="block w-full text-center text-sm font-semibold text-black/60 hover:text-accent"
              >
                View full cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
