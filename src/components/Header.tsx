"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useCartStore, cartTotalItems } from "@/lib/cart-store";
import { CATEGORIES } from "@/lib/products";
import { SITE_NAME } from "@/lib/site-config";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop All" },
  ...CATEGORIES.map((c) => ({
    href: `/products?category=${c.slug}`,
    label: c.name,
  })),
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.open);
  const count = cartTotalItems(items);

  return (
    <header className="sticky top-0 z-40 bg-black text-paper border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          className="lg:hidden p-2 -ml-2"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex items-center select-none">
          <Image
            src="/kanzie-logo-full.png"
            alt={SITE_NAME}
            width={160}
            height={90}
            priority
            className="h-11 sm:h-14 w-auto"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-8 font-display text-base tracking-wide">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-accent transition-colors"
            >
              {link.label.toUpperCase()}
            </Link>
          ))}
        </nav>

        <button
          className="relative p-2"
          aria-label="Open cart"
          onClick={openCart}
        >
          <ShoppingCart size={22} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </div>

      <div
        className={`lg:hidden fixed inset-0 bg-black/40 z-50 transition-opacity ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <nav
        className={`lg:hidden fixed top-0 left-0 h-full w-72 max-w-[80%] bg-black text-paper z-50 shadow-xl flex flex-col gap-1 pt-6 px-6 transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="font-display text-lg tracking-wide">{SITE_NAME}</span>
          <button
            aria-label="Close menu"
            className="p-2 -mr-2"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-display text-base tracking-wide py-2 hover:text-accent transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            {link.label.toUpperCase()}
          </Link>
        ))}
      </nav>
    </header>
  );
}
