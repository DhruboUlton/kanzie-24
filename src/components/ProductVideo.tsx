"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlayCircle, X, ShoppingCart, Maximize2, Volume2, VolumeX, Loader2 } from "lucide-react";
import { parseVideoUrl, VideoInfo } from "@/lib/video";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { Product } from "@/lib/products";

const AUTO_OPEN_DELAY_MS = 2500;
const WIDGET_WIDTH = 180;

export default function ProductVideo({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addItem = useCartStore((s) => s.addItem);
  const videoInfo: VideoInfo | null = product.videoUrl
    ? parseVideoUrl(product.videoUrl)
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

  const compareAt = product.compareAtPriceCents;
  const discountPct =
    compareAt && compareAt > product.priceCents
      ? Math.round((1 - product.priceCents / compareAt) * 100)
      : null;

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
              : "fixed z-40 bottom-4 right-4"
          }
          onClick={expanded ? close : undefined}
        >
          <div
            className={expanded ? "relative w-full max-w-sm" : "relative group cursor-pointer"}
            onClick={expanded ? (e) => e.stopPropagation() : handleWidgetClick}
          >
            {/* Top control buttons on floating widget */}
            {!expanded && (
              <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 pointer-events-auto">
                {isHtml5 && (
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors shadow-md cursor-pointer"
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                  }}
                  aria-label="Close video"
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors shadow-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Expand badge overlay on floating widget */}
            {!expanded && (
              <div className="absolute bottom-2 left-2 z-30 flex items-center gap-1 bg-black/70 text-white text-[11px] font-medium px-2 py-1 rounded-md opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                <Maximize2 size={12} />
                <span>Tap to expand</span>
              </div>
            )}

            {/* Close button in expanded mode */}
            {expanded && (
              <button
                type="button"
                onClick={close}
                aria-label="Close video"
                className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={28} />
              </button>
            )}

            <div
              className="relative rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10"
              style={
                expanded
                  ? undefined
                  : { width: WIDGET_WIDTH, height: (WIDGET_WIDTH * 16) / 9 }
              }
            >
              <div className={expanded ? "aspect-[9/16] w-full h-full relative" : "w-full h-full relative"}>
                {isHtml5 && videoSrc ? (
                  <>
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      poster={product.images[0]}
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                        <Loader2 className="animate-spin text-white" size={24} />
                      </div>
                    )}
                  </>
                ) : (
                  <iframe
                    src={
                      videoInfo.type === "youtube"
                        ? videoInfo.embedUrl
                        : videoInfo.type === "drive"
                        ? videoInfo.fallbackEmbedUrl
                        : videoInfo.src
                    }
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </div>

            {expanded && (
              <div className="bg-white rounded-lg shadow-2xl mt-3 p-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative shrink-0 w-12 h-12 rounded overflow-hidden bg-paper"
                  >
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-sm font-semibold text-ink line-clamp-1 hover:text-accent"
                    >
                      {product.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-accent font-semibold text-sm">
                        {formatPrice(product.priceCents)}
                      </span>
                      {compareAt && (
                        <span className="text-xs text-black/40 line-through">
                          {formatPrice(compareAt)}
                        </span>
                      )}
                      {discountPct !== null && (
                        <span className="text-[10px] font-semibold bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!product.inStock}
                  onClick={() =>
                    addItem({
                      productId: product.id,
                      slug: product.slug,
                      name: product.name,
                      priceCents: product.priceCents,
                      image: product.images[0],
                    })
                  }
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark disabled:bg-black/20 disabled:cursor-not-allowed transition-colors text-white font-display tracking-wide py-2.5 rounded cursor-pointer"
                >
                  <ShoppingCart size={16} />
                  {product.inStock ? "ADD TO CART" : "OUT OF STOCK"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
