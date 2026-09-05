"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Video } from "lucide-react";
import { parseVideoUrl, VideoInfo } from "@/lib/video";

// Below this the gesture is treated as a tap and the track springs back.
const COMMIT_RATIO = 0.18;
const COMMIT_MIN_PX = 40;
// A short, fast flick should turn the page even if it never travelled far.
const FLICK_MS = 250;
const FLICK_PX = 12;
// How far past the first/last slide the track will stretch before resisting.
const EDGE_RESISTANCE = 0.35;
const SETTLE = "transform 340ms cubic-bezier(0.22, 0.61, 0.36, 1)";

type Axis = "undecided" | "horizontal" | "vertical";

type GalleryItem =
  | { type: "image"; src: string }
  | { type: "video"; url: string; info: VideoInfo };

export default function ProductGallery({
  images,
  name,
  videoUrl,
}: {
  images: string[];
  name: string;
  videoUrl?: string | null;
}) {
  const [active, setActive] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [aspectRatios, setAspectRatios] = useState<Record<number, number>>({});

  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const axis = useRef<Axis>("undecided");

  // Aspect ratio comes from the rendered <Image>'s own onLoad below — no
  // second fetch of the same picture just to measure it. Until the active
  // slide's image loads, activeAspect falls back to square.

  const parsedVideo = videoUrl ? parseVideoUrl(videoUrl) : null;

  const items: GalleryItem[] = [
    ...images.map((img) => ({ type: "image" as const, src: img })),
    ...(parsedVideo
      ? [{ type: "video" as const, url: videoUrl!, info: parsedVideo }]
      : []),
  ];

  if (items.length === 0) return null;

  const count = items.length;
  const index = Math.min(active, count - 1);
  const currentItem = items[index];

  // Dynamic aspect ratio based on uploaded image dimensions or 16:9 for video
  const activeAspect =
    currentItem.type === "video"
      ? 16 / 9
      : aspectRatios[index] ?? aspectRatios[0] ?? 1;

  const step = (delta: number) => {
    setActive((i) => {
      const nextIndex = (i + delta + count) % count;
      if (items[i]?.type === "video" && videoRef.current) {
        videoRef.current.pause();
      }
      return nextIndex;
    });
  };

  const selectItem = (newIndex: number) => {
    if (items[index]?.type === "video" && videoRef.current) {
      videoRef.current.pause();
    }
    setActive(newIndex);
  };

  function onTouchStart(e: React.TouchEvent) {
    if (count < 2) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    axis.current = "undecided";
    setDragging(true);
    setDragX(0);
  }

  function onTouchMove(e: React.TouchEvent) {
    const s = start.current;
    if (!s) return;

    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;

    // Decide once whether gesture is horizontal or vertical
    if (axis.current === "undecided") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (axis.current !== "horizontal") return;

    const atStart = index === 0 && dx > 0;
    const atEnd = index === count - 1 && dx < 0;
    setDragX(atStart || atEnd ? dx * EDGE_RESISTANCE : dx);
  }

  function onTouchEnd() {
    const s = start.current;
    start.current = null;
    setDragging(false);

    if (!s || axis.current !== "horizontal") {
      setDragX(0);
      return;
    }

    const width = trackRef.current?.clientWidth ?? 0;
    const threshold = Math.max(COMMIT_MIN_PX, width * COMMIT_RATIO);
    const flicked = Date.now() - s.t < FLICK_MS && Math.abs(dragX) > FLICK_PX;

    if (Math.abs(dragX) > threshold || flicked) {
      if (dragX < 0 && index < count - 1) step(1);
      else if (dragX > 0 && index > 0) step(-1);
    }
    setDragX(0);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main Dynamic Media Frame */}
      <div
        ref={trackRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          touchAction: "pan-y",
          aspectRatio: `${activeAspect}`,
          transition: "aspect-ratio 340ms cubic-bezier(0.22, 0.61, 0.36, 1)",
        }}
        className="relative w-full max-h-[650px] min-h-[260px] bg-white rounded-lg overflow-hidden select-none flex items-center justify-center"
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${dragX}px), 0, 0)`,
            transition: dragging ? "none" : SETTLE,
            willChange: "transform",
          }}
        >
          {items.map((item, i) => (
            <div
              key={`slide-${i}`}
              className="relative h-full w-full shrink-0 flex items-center justify-center overflow-hidden"
            >
              {item.type === "image" ? (
                <Image
                  src={item.src}
                  alt={i === 0 ? name : `${name} — view ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  priority={i === 0}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      const ratio = img.naturalWidth / img.naturalHeight;
                      setAspectRatios((prev) =>
                        prev[i] === ratio ? prev : { ...prev, [i]: ratio }
                      );
                    }
                  }}
                  className="object-contain pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  {item.info.type === "direct" ? (
                    <video
                      ref={videoRef}
                      src={item.info.src}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <iframe
                      src={
                        item.info.type === "youtube"
                          ? item.info.embedUrl
                          : item.info.fallbackEmbedUrl
                      }
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            {/* Arrows for mouse users */}
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous media"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow transition-colors cursor-pointer z-10"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next media"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow transition-colors cursor-pointer z-10"
            >
              <ChevronRight size={18} />
            </button>

            {/* Mobile indicator dots */}
            <div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {items.map((_, i) => (
                <span
                  key={`dot-${i}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-4 bg-accent" : "w-1.5 bg-black/25"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails Row */}
      {count > 1 && (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 sm:gap-3">
          {items.map((item, i) => (
            <button
              key={`thumb-${i}`}
              type="button"
              onClick={() => selectItem(i)}
              aria-label={
                item.type === "video"
                  ? "Show product video"
                  : `Show image ${i + 1} of ${count}`
              }
              aria-current={i === index}
              className={`relative aspect-square bg-white rounded-md overflow-hidden border-2 transition-colors cursor-pointer flex items-center justify-center ${
                i === index
                  ? "border-accent shadow-xs"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              {item.type === "image" ? (
                <Image
                  src={item.src}
                  alt={`${name} — thumb ${i + 1}`}
                  fill
                  sizes="120px"
                  className="object-contain p-1"
                />
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black text-white">
                  {images[0] ? (
                    <>
                      <Image
                        src={images[0]}
                        alt="Product video preview"
                        fill
                        sizes="120px"
                        className="object-cover opacity-50"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-accent/90 flex items-center justify-center shadow-md">
                          <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white mt-1 drop-shadow">
                          Video
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Video className="w-5 h-5 text-accent" />
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
                        Video
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
