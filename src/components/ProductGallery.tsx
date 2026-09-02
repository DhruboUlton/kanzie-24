"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Runtime-uploaded media is streamed from outside the app root, so the
// image optimizer can't resolve it — those load directly instead.
function isUpload(src: string) {
  return src.startsWith("/api/uploads/");
}

// A swipe has to beat this before it counts, so a slightly-diagonal scroll
// down the page doesn't flick the image sideways.
const SWIPE_THRESHOLD_PX = 40;

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (images.length === 0) return null;

  const count = images.length;
  const index = Math.min(active, count - 1);
  const current = images[index];

  const step = (delta: number) => setActive((i) => (i + delta + count) % count);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || count < 2) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    // Vertical wins ties: the page still has to scroll normally under a
    // finger that is mostly going up or down.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;

    step(dx < 0 ? 1 : -1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        // pan-y keeps vertical scrolling with the browser while horizontal
        // movement reaches the handlers above.
        style={{ touchAction: "pan-y" }}
        className="relative aspect-square bg-paper rounded-lg overflow-hidden select-none"
      >
        <Image
          src={current}
          alt={name}
          fill
          priority
          unoptimized={isUpload(current)}
          className="object-cover pointer-events-none"
          draggable={false}
        />

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
                  className={`h-1.5 rounded-full transition-all ${
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
