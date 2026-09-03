"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Runtime-uploaded media is streamed from outside the app root, so the
// image optimizer can't resolve it — those load directly instead.
function isUpload(src: string) {
  return src.startsWith("/api/uploads/");
}

// All the images sit side by side in one track and the track is what moves.
// Swapping the <Image src> instead — which is what this used to do — lands
// the next photo instantly with nothing in between, and reads as a glitch
// rather than a swipe.

// Below this the gesture is treated as a tap and the track springs back.
const COMMIT_RATIO = 0.18;
const COMMIT_MIN_PX = 40;
// A short, fast flick should turn the page even if it never travelled far.
const FLICK_MS = 250;
const FLICK_PX = 12;
// How far past the first/last image the track will stretch before resisting.
const EDGE_RESISTANCE = 0.35;
const SETTLE = "transform 340ms cubic-bezier(0.22, 0.61, 0.36, 1)";

type Axis = "undecided" | "horizontal" | "vertical";

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const axis = useRef<Axis>("undecided");

  if (images.length === 0) return null;

  const count = images.length;
  const index = Math.min(active, count - 1);

  const step = (delta: number) => setActive((i) => (i + delta + count) % count);

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

    // Decide once, on the first few pixels, whether this gesture belongs to
    // the gallery or to the page. Without the lock a mostly-vertical scroll
    // drags the track sideways the whole way down.
    if (axis.current === "undecided") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (axis.current !== "horizontal") return;

    // There is nothing beyond the first and last image, so pulling that way
    // gets heavier instead of revealing blank space.
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
    // Cleared either way: the transform below settles onto whichever image
    // is now active, animated because dragging is false again.
    setDragX(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={trackRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        // pan-y keeps vertical scrolling with the browser while horizontal
        // movement reaches the handlers above.
        style={{ touchAction: "pan-y" }}
        className="relative aspect-square bg-paper rounded-lg overflow-hidden select-none"
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${dragX}px), 0, 0)`,
            // No transition while a finger is down, or the track lags behind
            // it instead of tracking it.
            transition: dragging ? "none" : SETTLE,
            willChange: "transform",
          }}
        >
          {images.map((img, i) => (
            <div key={`slide-${img}-${i}`} className="relative h-full w-full shrink-0">
              <Image
                src={img}
                alt={i === 0 ? name : `${name} — view ${i + 1}`}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                priority={i === 0}
                unoptimized={isUpload(img)}
                className="object-cover pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            {/* Arrows for mouse users; the swipe above covers touch. */}
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>

            {/* Tells a phone user there is more than one photo — without it
                nothing on screen suggests the image can be swiped. */}
            <div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((img, i) => (
                <span
                  key={`dot-${img}-${i}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-4 bg-accent" : "w-1.5 bg-black/25"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={i === index}
              className={`relative aspect-square bg-paper rounded-md overflow-hidden border-2 transition-colors cursor-pointer ${
                i === index
                  ? "border-accent"
                  : "border-transparent hover:border-black/20"
              }`}
            >
              <Image
                src={img}
                alt={`${name} — view ${i + 1}`}
                fill
                sizes="120px"
                unoptimized={isUpload(img)}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
