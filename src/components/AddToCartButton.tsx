"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Product } from "@/lib/products";

export default function AddToCartButton({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  return (
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
        disabled={!product.inStock}
        onClick={() =>
          addItem(
            {
              productId: product.id,
              slug: product.slug,
              name: product.name,
              priceCents: product.priceCents,
              image: product.images[0],
            },
            qty,
          )
        }
        className="flex-1 bg-accent hover:bg-accent-dark disabled:bg-black/20 disabled:cursor-not-allowed transition-colors text-white font-display tracking-wide py-3.5 rounded"
      >
        {product.inStock ? "ADD TO CART" : "OUT OF STOCK"}
      </button>
    </div>
  );
}
