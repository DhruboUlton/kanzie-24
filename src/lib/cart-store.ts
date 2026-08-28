"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  image: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      addItem: (item, qty = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, qty: i.qty + qty }
                : i,
            ),
            isOpen: true,
          });
        } else {
          set({ items: [...items, { ...item, qty }], isOpen: true });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, qty } : i,
          ),
        });
      },
      clear: () => set({ items: [] }),
    }),
    { name: "rc-toy-cart" },
  ),
);

export function cartTotalItems(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function cartTotalCents(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty * i.priceCents, 0);
}

// "Buy now" hands a single item to /checkout without touching the persisted
// cart — sessionStorage rather than the cart store so it survives the
// navigation but is scoped to this tab and read exactly once.
export const BUY_NOW_KEY = "kanzie-buy-now";

export function setBuyNowItem(item: CartItem) {
  sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(item));
}

export function takeBuyNowItem(): CartItem | null {
  const raw = sessionStorage.getItem(BUY_NOW_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(BUY_NOW_KEY);
  try {
    return JSON.parse(raw) as CartItem;
  } catch {
    return null;
  }
}
