"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ChevronDown, Menu, ShoppingCart, X, PackageSearch } from "lucide-react";
import { useCartStore, cartTotalItems } from "@/lib/cart-store";
import { CategoryNode } from "@/lib/products";
import { SITE_NAME } from "@/lib/site-config";

export default function Header({ tree = [] }: { tree?: CategoryNode[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.open);
  const count = cartTotalItems(items);

  const closeMobile = () => {
    setMenuOpen(false);
    setOpenGroup(null);
  };

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
          <Link href="/" className="hover:text-accent transition-colors">
            HOME
          </Link>
          <Link href="/products" className="hover:text-accent transition-colors">
            SHOP ALL
          </Link>

          {tree.map((parent) => (
            <div key={parent.slug} className="relative group">
              <Link
                href={`/products?category=${parent.slug}`}
                className="flex items-center gap-1 hover:text-accent transition-colors py-5"
              >
                {parent.name.toUpperCase()}
                {parent.children.length > 0 && (
                  <ChevronDown
                    size={14}
                    className="transition-transform group-hover:rotate-180"
                  />
                )}
              </Link>

              {parent.children.length > 0 && (
                <div className="absolute left-0 top-full min-w-52 bg-black border border-white/10 rounded-b-lg shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150">
                  {parent.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/products?category=${child.slug}`}
                      className="block px-4 py-2 text-sm font-sans tracking-normal text-paper/80 hover:text-accent hover:bg-white/5 transition-colors"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/track"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 hover:border-accent text-paper hover:text-white text-xs font-semibold tracking-wide transition-colors"
            title="Track your order"
          >
            <PackageSearch size={14} className="text-accent" />
            <span>Track Order</span>
          </Link>

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
      </div>

      <div
        className={`lg:hidden fixed inset-0 bg-black/40 z-50 transition-opacity ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobile}
      />
      <nav
        className={`lg:hidden fixed top-0 left-0 h-full w-72 max-w-[80%] bg-black text-paper z-50 shadow-xl flex flex-col gap-1 pt-6 px-6 overflow-y-auto transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="font-display text-lg tracking-wide">{SITE_NAME}</span>
          <button aria-label="Close menu" className="p-2 -mr-2" onClick={closeMobile}>
            <X size={20} />
          </button>
        </div>

        <Link
          href="/"
          className="font-display text-base tracking-wide py-2 hover:text-accent transition-colors"
          onClick={closeMobile}
        >
          HOME
        </Link>
        <Link
          href="/products"
          className="font-display text-base tracking-wide py-2 hover:text-accent transition-colors"
          onClick={closeMobile}
        >
          SHOP ALL
        </Link>

        {tree.map((parent) => (
          <div key={parent.slug}>
            <div className="flex items-center justify-between">
              <Link
                href={`/products?category=${parent.slug}`}
                className="font-display text-base tracking-wide py-2 hover:text-accent transition-colors"
                onClick={closeMobile}
              >
                {parent.name.toUpperCase()}
              </Link>
              {parent.children.length > 0 && (
                <button
                  type="button"
                  aria-label={`Toggle ${parent.name} subcategories`}
                  aria-expanded={openGroup === parent.slug}
                  onClick={() =>
                    setOpenGroup((g) => (g === parent.slug ? null : parent.slug))
                  }
                  className="p-2 -mr-2"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      openGroup === parent.slug ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>

            {openGroup === parent.slug && (
              <div className="flex flex-col pl-4 pb-2 border-l border-white/10 ml-1">
                {parent.children.map((child) => (
                  <Link
                    key={child.slug}
                    href={`/products?category=${child.slug}`}
                    className="text-sm text-paper/70 py-1.5 hover:text-accent transition-colors"
                    onClick={closeMobile}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="mt-auto pt-6 pb-6 border-t border-white/10">
          <Link
            href="/track"
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded border border-accent text-white text-sm font-semibold hover:bg-accent transition-colors"
            onClick={closeMobile}
          >
            <PackageSearch size={16} className="text-accent" />
            <span>Track your order</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
