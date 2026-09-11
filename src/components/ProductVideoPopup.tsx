"use client";

import { useEffect, useRef, useState } from "react";
import SkeletonImage from "@/components/SkeletonImage";
import Link from "next/link";
import { PlayCircle, X, ShoppingCart, Maximize2, Volume2, VolumeX, Loader2 } from "lucide-react";
import { parseVideoUrl, VideoInfo } from "@/lib/video";
import { useCartStore } from "@/lib/cart-store";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { Product } from "@/lib/products";

const AUTO_OPEN_DELAY_MS = 2500;

export default function ProductVideoPopup({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addItem = useCartStore((s) => s.addItem);
  const videoInfo: VideoInfo | null = product.popupVideoUrl
    ? parseVideoUrl(product.popupVideoUrl)
    : null;

  useEffect(() => {
    if (!videoInfo || dismissed) return;
    const timer = setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [videoInfo, dismissed]);

  // Synchronize muted DOM property and trigger autoplay
  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.defaultMuted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser blocked unmuted playback, force mute and retry
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [open, expanded, isMuted]);

  function openExpanded() {
    setDismissed(false);
    setOpen(true);
    setExpanded(true);
    setIsMuted(false);
  }

  function close() {
    setOpen(false);
    setExpanded(false);
    setDismissed(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  }

  function handleWidgetClick() {
    if (!expanded) {
      setExpanded(true);
      setIsMuted(false);
    }
  }

  if (!videoInfo) return null;

  // Was a second, private discount calculation that only understood
  // compareAtPriceCents and so would have ignored a percentage sale entirely.
  const pricing = resolvePricing(product);
  const availability = resolveAvailability(product);

  const isHtml5 =
    !useFallback &&
    (videoInfo.type === "direct" || videoInfo.type === "drive");

  const videoSrc =
    videoInfo.type === "drive"
      ? videoInfo.directUrl
      : videoInfo.type === "direct"
      ? videoInfo.src
      : null;

  return (
    <>
      <button
        type="button"
        onClick={openExpanded}
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-accent transition-colors cursor-pointer"
      >
        <PlayCircle size={20} className="text-accent" />
        Watch video
      </button>

      {open && (
        <div
          className={
            expanded
              ? "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
              : "fixed z-40 bottom-3 right-3 sm:bottom-4 sm:right-4"
          }
          onClick={expanded ? close : undefined}
        >
          <div
            className={expanded ? "relative w-full max-w-xs sm:max-w-sm" : "relative group cursor-pointer"}
            onClick={expanded ? (e) => e.stopPropagation() : handleWidgetClick}
          >
            {/* Top control buttons on floating widget */}
            {!expanded && (
              <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-30 flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
                {isHtml5 && (
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors shadow-md cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                  }}
                  aria-label="Close video"
                  className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors shadow-md cursor-pointer"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}

            {/* Expand badge overlay on floating widget */}
            {!expanded && (
              <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 z-30 flex items-center gap-1 bg-black/70 text-white text-[9px] sm:text-[11px] font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded sm:rounded-md opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Expand</span>
              </div>
            )}

            {/* Close button in expanded mode */}
            {expanded && (
              <button
                type="button"
                onClick={close}
                aria-label="Close video"
                className="absolute -top-9 right-0 sm:-top-10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={26} />
              </button>
            )}

            <div
              className={`relative rounded-lg sm:rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10 ${
                expanded
                  ? "w-full"
                  : "w-[105px] h-[186px] sm:w-[160px] sm:h-[284px]"
              }`}
            >
              <div className={expanded ? "aspect-[9/16] w-full h-full relative" : "w-full h-full relative"}>
                {isHtml5 && videoSrc ? (
                  <>
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      poster={product.images[0] || PRODUCT_IMAGE_PLACEHOLDER}
                      autoPlay
                      muted={isMuted}
                      playsInline
                      loop
                      preload="auto"
                      controls={expanded}
                      onPlaying={() => setIsVideoLoaded(true)}
                      onLoadedData={() => {
                        setIsVideoLoaded(true);
                        if (videoRef.current) {
                          videoRef.current.play().catch(() => {});
                        }
                      }}
                      onError={() => {
                        console.warn("Video failed to play directly, using fallback");
                        setUseFallback(true);
                      }}
                      className="w-full h-full object-cover"
                    />
                    {!isVideoLoaded && (
                      <div className="absolute inset-0 skeleton-shimmer-dark flex items-center justify-center pointer-events-none z-10">
                        <Loader2 className="animate-spin text-white/80 w-4 h-4 sm:w-6 sm:h-6 z-20" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <iframe
                      src={
                        videoInfo.type === "youtube"
                          ? videoInfo.embedUrl
                          : videoInfo.type === "drive"
                          ? videoInfo.fallbackEmbedUrl
                          : videoInfo.src
                      }
                      onLoad={() => setIsIframeLoaded(true)}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                    {!isIframeLoaded && (
                      <div className="absolute inset-0 skeleton-shimmer-dark flex items-center justify-center pointer-events-none z-10">
                        <Loader2 className="animate-spin text-white/80 w-4 h-4 sm:w-6 sm:h-6 z-20" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {expanded && (
              <div className="bg-white rounded-lg shadow-2xl mt-2.5 sm:mt-3 p-2.5 sm:p-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden bg-paper"
                  >
                    <SkeletonImage
                      src={product.images[0] || PRODUCT_IMAGE_PLACEHOLDER}
                      alt={product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-xs sm:text-sm font-semibold text-ink line-clamp-1 hover:text-accent"
                    >
                      {product.name}
                    </Link>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                      <span className="text-accent font-semibold text-xs sm:text-sm">
                        {formatPrice(pricing.effectiveCents)}
                      </span>
                      {pricing.originalCents !== null && (
                        <span className="text-[11px] sm:text-xs text-black/60 line-through">
                          {formatPrice(pricing.originalCents)}
                        </span>
                      )}
                      {pricing.onSale && (
                        <span className="text-[9px] sm:text-[10px] font-semibold bg-accent/10 text-accent px-1 sm:px-1.5 py-0.5 rounded">
                          {pricing.percentOff}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!availability.purchasable}
                  onClick={() => {
                    if (!availability.purchasable) return;
                    addItem({
                      productId: product.id,
                      slug: product.slug,
                      name: product.name,
                      priceCents: pricing.effectiveCents,
                      image: product.images[0],
                    });
                  }}
                  className="mt-2.5 sm:mt-3 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark disabled:bg-black/20 disabled:cursor-not-allowed transition-colors text-white font-display text-xs sm:text-sm tracking-wide py-2 sm:py-2.5 rounded cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {availability.purchasable
                    ? "ADD TO CART"
                    : availability.label.toUpperCase()}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
