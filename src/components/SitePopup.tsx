"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import SkeletonImage from "@/components/SkeletonImage";
import { usePathname } from "next/navigation";
import { X, Copy, Check } from "lucide-react";
import { PopupConfig } from "@/lib/popup";

export default function SitePopup({ config }: { config: PopupConfig }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Record that this visitor has now seen the popup.
   *
   * Called when it opens, not when it is dismissed. Keyed on dismissal, a
   * visitor who simply moved to another page was shown it again on every
   * one, which is not what "once per session" says.
   */
  const rememberShown = useCallback(() => {
    try {
      if (config.showFrequency === "once_per_session") {
        sessionStorage.setItem("kanzie_popup_dismissed", "true");
      } else if (config.showFrequency === "once_per_day") {
        localStorage.setItem("kanzie_popup_dismissed_time", Date.now().toString());
      }
    } catch {
      // Storage blocked, private browsing. The popup simply shows again.
    }
  }, [config.showFrequency]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    rememberShown();
    // Back where they were, so a keyboard user is not dumped at the top of
    // the document after closing.
    returnFocusRef.current?.focus?.();
  }, [rememberShown]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab") return;

      // Keep Tab inside the dialog. Without this, aria-modal is a claim the
      // keyboard does not honour: focus walks straight out into the page
      // behind the backdrop, which is still fully tabbable.
      const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !cardRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, dismiss]);

  // Evaluate trigger conditions and schedule delay
  useEffect(() => {
    if (!config.enabled) return;

    // 1. Check page targeting.
    // Cart and checkout are excluded whatever the setting says: a discount
    // modal thrown over a purchase in progress interrupts the one journey
    // the shop exists for.
    if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) {
      return;
    }
    if (config.targetPages === "home_only" && pathname !== "/") {
      return;
    }
    if (
      config.targetPages === "products_only" &&
      !pathname.startsWith("/products")
    ) {
      return;
    }

    // 2. Check frequency
    try {
      if (config.showFrequency === "once_per_session") {
        if (sessionStorage.getItem("kanzie_popup_dismissed") === "true") {
          return;
        }
      } else if (config.showFrequency === "once_per_day") {
        const last = localStorage.getItem("kanzie_popup_dismissed_time");
        if (last) {
          const elapsed = Date.now() - parseInt(last, 10);
          if (elapsed < 24 * 60 * 60 * 1000) {
            return;
          }
        }
      }
    } catch {
      // Ignore storage errors
    }

    // 3. Schedule delay
    const delayMs = Math.max(0, config.delaySeconds) * 1000;
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    config.enabled,
    config.targetPages,
    config.showFrequency,
    config.delaySeconds,
    pathname,
  ]);

  // Once it is on screen: bank the "seen" flag and move focus into the card,
  // which is what makes role="dialog" mean anything to a screen reader.
  useEffect(() => {
    if (!isOpen) return;
    rememberShown();
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      cardRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, rememberShown]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen || !config.enabled) {
    return null;
  }

  async function handleCopy() {
    if (!config.couponCode) return;
    try {
      await navigator.clipboard.writeText(config.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={dismiss}
        className="fixed inset-0 bg-black/65 backdrop-blur-xs popup-fade-in"
      />

      {/* Pop up Card */}
      <div
        ref={cardRef}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center border border-gray-100 z-10 popup-zoom-in"
      >
        {/* Close Button X */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close pop up"
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Logo or Top Graphic */}
        {config.imageUrl ? (
          <div className="mb-4 flex justify-center">
            <SkeletonImage
              src={config.imageUrl}
              alt={config.imageAlt || "Offer"}
              width={200}
              height={56}
              unoptimized={!config.imageUrl.startsWith("/")}
              className="max-h-14 max-w-[200px] object-contain"
            />
          </div>
        ) : (
          // No custom image chosen, so the shop's own mark stands in. The
          // wordmark files are white-on-transparent and would vanish against
          // this white card; kanzie-icon.png is the red mark on its own.
          <div className="mb-4 flex justify-center">
            <SkeletonImage
              src="/kanzie-icon.png"
              alt="KANZIE"
              width={256}
              height={220}
              className="h-11 w-auto"
            />
          </div>
        )}

        {/* Optional Badge / Eyebrow */}
        {config.badgeText && (
          <div className="mb-2">
            <span className="inline-block bg-red-50 text-[#c0282b] text-[11px] font-extrabold px-3 py-0.5 rounded-full tracking-wider uppercase">
              {config.badgeText}
            </span>
          </div>
        )}

        {/* Title */}
        <h2
          id="site-popup-title"
          className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase mb-2 leading-tight"
        >
          {config.title}
        </h2>

        {/* Description / Message */}
        {config.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            {config.description}
          </p>
        )}

        {/* Optional Coupon Code Box with 1-Click Copy */}
        {config.couponCode && (
          <div className="mb-5 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-between gap-3">
            <div className="text-left">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Use Coupon Code
              </span>
              <span className="font-mono font-bold text-base text-gray-900 tracking-wider">
                {config.couponCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Primary Action Button */}
        {config.primaryButtonText && (
          <Link
            href={config.primaryButtonUrl || "/products"}
            onClick={dismiss}
            className="block w-full py-3 px-5 bg-[#121212] hover:bg-black text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {config.primaryButtonText}
          </Link>
        )}

        {/* Secondary / Dismiss Link */}
        {config.secondaryButtonText && (
          <button
            type="button"
            onClick={dismiss}
            className="mt-3.5 text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium cursor-pointer block w-full text-center"
          >
            {config.secondaryButtonText}
          </button>
        )}

        {/* Optional Footer Disclaimer */}
        {config.footerText && (
          <p className="mt-3.5 text-[11px] text-gray-400 leading-tight">
            {config.footerText}
          </p>
        )}
      </div>
    </div>
  );
}
