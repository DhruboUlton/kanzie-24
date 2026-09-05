"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useCartStore, setBuyNowItem } from "@/lib/cart-store";
import { Product } from "@/lib/products";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";

export default function AddToCartButton({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();

  const availability = resolveAvailability(product);
  const pricing = resolvePricing(product);

  const item = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    // The discounted figure, so the cart shows what the order will charge.
    // The server re-derives it from the catalogue regardless.
    priceCents: pricing.effectiveCents,
    image: product.images[0],
  };

  function handleBuyNow() {
    if (!availability.purchasable) return;
    setBuying(true);
    setBuyNowItem({ ...item, qty });
    router.push("/checkout");
  }

  function handleAddToCart() {
    if (!availability.purchasable) return;
    addItem(item, qty);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center border border-black/15 rounded">
          <button
            className="p-3"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center">{qty}</span>
          <button
            className="p-3"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => q + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          disabled={!availability.purchasable}
          onClick={handleAddToCart}
          className="flex-1 bg-white border border-accent hover:bg-accent/5 disabled:bg-black/5 disabled:border-black/20 disabled:text-black/60 disabled:cursor-not-allowed transition-colors text-accent font-display tracking-wide py-3.5 rounded"
        >
          {availability.purchasable
            ? "ADD TO CART"
            : availability.label.toUpperCase()}
        </button>
      </div>
      <button
        disabled={!availability.purchasable || buying}
        onClick={handleBuyNow}
        className="bg-accent hover:bg-accent-dark disabled:bg-black/20 disabled:cursor-not-allowed transition-colors text-white font-display tracking-wide py-3.5 rounded"
      >
        {!availability.purchasable
          ? availability.label.toUpperCase()
          : buying
          ? "REDIRECTING…"
          : "BUY NOW"}
      </button>
    </div>
  );
}
