"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  ShoppingCart,
  X,
  PackageSearch,
} from "lucide-react";
import { useCartStore, cartTotalItems } from "@/lib/cart-store";
import { CategoryNode } from "@/lib/products";
import { SITE_NAME } from "@/lib/site-config";

// min-w-52 resolves to 182px here — globals.css sets the root font size to 87.5%.
const DROPDOWN_WIDTH = 182;
const SCROLL_STEP = 240;

export default function Header({ tree = [] }: { tree?: CategoryNode[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.open);
  const count = cartTotalItems(items);

  const headerRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // The strip clips its overflow, so an absolutely positioned submenu would be
  // cut off. Submenus render fixed instead, anchored to their parent link.
  const [dropdown, setDropdown] = useState<{
    slug: string;
    left: number;
    top: number;
  } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  const syncScrollState = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const max = strip.scrollWidth - strip.clientWidth;
    setCanScrollLeft(strip.scrollLeft > 1);
    setCanScrollRight(strip.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    syncScrollState();
    const observer = new ResizeObserver(syncScrollState);
    observer.observe(strip);
    for (const child of Array.from(strip.children)) observer.observe(child);
    window.addEventListener("resize", syncScrollState);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncScrollState);
    };
  }, [syncScrollState, tree]);

  const placeDropdown = useCallback((slug: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const headerBottom =
      headerRef.current?.getBoundingClientRect().bottom ?? rect.bottom;
    setDropdown({
      slug,
      // Keep the panel inside the viewport when a category sits near the edge.
      left: Math.max(8, Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 16)),
      top: headerBottom,
    });
  }, []);

  const anchorDropdown = (slug: string, anchor: HTMLElement) => {
    anchorRef.current = anchor;
    placeDropdown(slug, anchor);
  };

  // The strip can scroll while a submenu is open — a wheel, an arrow, or the
  // browser scrolling a focused submenu link into view. Follow the category
  // instead of closing, and only drop the panel once its category is gone.
  const handleStripScroll = () => {
    syncScrollState();
    const strip = stripRef.current;
    const anchor = anchorRef.current;
    if (!dropdown || !strip || !anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    const centre = anchorRect.left + anchorRect.width / 2;
    if (centre < stripRect.left || centre > stripRect.right) {
      anchorRef.current = null;
      setDropdown(null);
      return;
    }
    placeDropdown(dropdown.slug, anchor);
  };

  const nudge = (direction: -1 | 1) => {
    stripRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  };

  const closeMobile = () => {
    setMenuOpen(false);
    setOpenGroup(null);
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 bg-black text-paper border-b border-white/10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6 lg:gap-12">
        <button
          className="lg:hidden p-2 -ml-2"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex items-center select-none shrink-0">
          {/* Trimmed of the source art's uneven transparent margin, which sat
              1783px above the mark and 1252px below and pushed the logo ~3px
              off the header's centre line. These heights are the wordmark
              itself, so it now centres on its own. */}
          <Image
            src="/kanzie-logo.png"
            alt={SITE_NAME}
            width={1000}
            height={193}
            priority
            // Without this the srcset is built off the declared 1000px and a
            // retina phone pulls a 2048px-wide file for a 16px-tall logo.
            // The rendered width is the height times the 1000:193 ratio.
            sizes="(min-width: 640px) 83px, 62px"
            className="h-[12px] sm:h-4 w-auto"
          />
        </Link>

        <nav className="hidden lg:flex items-center justify-center gap-8 min-w-0 flex-1 font-display text-base tracking-wide">
          <Link href="/" className="shrink-0 hover:text-accent transition-colors">
            HOME
          </Link>
          <Link
            href="/products"
            className="shrink-0 hover:text-accent transition-colors"
          >
            SHOP ALL
          </Link>

          {tree.length > 0 && (
            <div className="relative flex items-center min-w-0">
              {canScrollLeft && (
                <button
                  type="button"
                  aria-label="Scroll categories left"
                  onClick={() => nudge(-1)}
                  className="absolute left-0 z-10 h-full w-10 flex items-center justify-start bg-gradient-to-r from-black from-40% to-transparent text-paper/70 hover:text-accent transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              <div
                ref={stripRef}
                onScroll={handleStripScroll}
                className="nav-scroll flex items-center gap-8 min-w-0 overflow-x-auto overscroll-x-contain"
              >
                {tree.map((parent) => (
                  <div
                    key={parent.slug}
                    className="relative group shrink-0"
                    onMouseEnter={(e) => {
                      if (parent.children.length > 0)
                        anchorDropdown(parent.slug, e.currentTarget);
                    }}
                  >
                    <Link
                      href={`/products?category=${parent.slug}`}
                      className="flex items-center gap-1 whitespace-nowrap hover:text-accent transition-colors py-5"
                    >
                      {parent.name.toUpperCase()}
                      {parent.children.length > 0 && (
                        <ChevronDown
                          size={14}
                          className="transition-transform group-hover:rotate-180"
                        />
                      )}
                    </Link>

                    {parent.children.length > 0 && dropdown?.slug === parent.slug && (
                      <div
                        style={{ left: dropdown.left, top: dropdown.top }}
                        className="fixed min-w-52 bg-black border border-white/10 rounded-b-lg shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150"
                      >
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
              </div>

              {canScrollRight && (
                <button
                  type="button"
                  aria-label="Scroll categories right"
                  onClick={() => nudge(1)}
                  className="absolute right-0 z-10 h-full w-10 flex items-center justify-end bg-gradient-to-l from-black from-40% to-transparent text-paper/70 hover:text-accent transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/track"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 hover:border-accent text-paper hover:text-white text-xs font-semibold tracking-wide transition-colors whitespace-nowrap"
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
