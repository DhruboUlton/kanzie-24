"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SITE_TAGLINE } from "@/lib/site-config";

const WATERMARKS = ["DIG", "HAUL", "PUSH", "BUILD"];

// Decorative banner renders — not tied to the product catalog.
const SLIDES = [
  { src: "/hero/top-power-excavator.png", alt: "Top Power RC excavator" },
  { src: "/hero/jcb-backhoe-loader-1.png", alt: "JCB RC backhoe loader" },
  { src: "/hero/jcb-backhoe-loader-2.png", alt: "JCB RC backhoe loader, arm raised" },
  { src: "/hero/jcb-220x-excavator.png", alt: "JCB 220X LC RC excavator" },
];

const n = SLIDES.length;
const TRANSITION_MS = 500;

// Shortest signed distance from `index` to `i` on a ring of size `n`.
function ringOffset(i: number) {
  let d = i % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

// Recycle an offset by a full lap (±n) once it's drifted past the visible
// window (center + 1 neighbor either side). Only ever applied to a slide
// that has *already finished* fading to opacity 0 (see the deferred call
// below) — recycling in the same update as the shift jumped a slide's
// transform 3 slots while its opacity was still fading from visible,
// which read as a reverse slide across the track.
function recycle(o: number) {
  if (o <= -n / 2) return o + n;
  if (o > n / 2) return o - n;
  return o;
}

export default function HeroSlider() {
  const [offsets, setOffsets] = useState<number[]>(() =>
    SLIDES.map((_, i) => ringOffset(i)),
  );
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shift = useCallback((getDelta: (prev: number[]) => number[]) => {
    setOffsets(getDelta);
    if (recycleRef.current) clearTimeout(recycleRef.current);
    recycleRef.current = setTimeout(() => {
      setOffsets((prev) => prev.map(recycle));
    }, TRANSITION_MS);
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => shift((prev) => prev.map((o) => o - direction)),
    [shift],
  );
  const goToSlide = useCallback(
    (i: number) => shift((prev) => prev.map((o) => o - prev[i])),
    [shift],
  );

  const goPrev = useCallback(() => step(-1), [step]);
  const goNext = useCallback(() => step(1), [step]);

  useEffect(() => {
    return () => {
      if (recycleRef.current) clearTimeout(recycleRef.current);
    };
  }, []);

  useEffect(() => {
    if (n < 2) return;
    autoplayRef.current = setInterval(goNext, 4500);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [goNext]);

  const centerIndex = offsets.findIndex((o) => o === 0);

  return (
    <section className="relative bg-paper overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span
          key={centerIndex}
          className="font-display text-[26vw] leading-none text-black/5 whitespace-nowrap"
        >
          {WATERMARKS[centerIndex % WATERMARKS.length]}
        </span>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10 py-16 sm:py-20">
        <div className="relative h-80 sm:h-[30rem] max-w-sm sm:max-w-xl mx-auto">
          {SLIDES.map((slide, i) => {
            const offset = offsets[i];
            const isCenter = offset === 0;
            const abs = Math.abs(offset);

            const scale = isCenter ? 1.25 : 0.5;
            const opacity = abs > 1 ? 0 : isCenter ? 1 : 0.8;
            const zIndex = 10 - abs;

            return (
              <button
                key={slide.src}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                aria-hidden={!isCenter}
                tabIndex={isCenter ? -1 : 0}
                onClick={() => !isCenter && goToSlide(i)}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translateX(${offset * 46}%) scale(${scale})`,
                  opacity,
                  zIndex,
                  cursor: isCenter ? "default" : "pointer",
                  pointerEvents: abs > 1 ? "none" : "auto",
                  transition: "transform 500ms ease-out, opacity 500ms ease-out",
                }}
              >
                <div className="relative w-80 h-80 sm:w-[30rem] sm:h-[30rem] drop-shadow-xl">
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes="(max-width: 640px) 320px, 480px"
                    priority={isCenter}
                    className="object-contain"
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative z-20 flex flex-col items-center text-center gap-4 mt-2">
          <h1 className="font-display text-3xl sm:text-5xl tracking-wide">
            {SITE_TAGLINE}
          </h1>
          <Link
            href="/products"
            className="inline-block bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide px-8 py-3 rounded"
          >
            SHOP NOW
          </Link>
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous slide"
            className="hidden sm:flex absolute left-4 top-[38%] -translate-y-1/2 z-30 w-10 h-10 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goNext}
            aria-label="Next slide"
            className="hidden sm:flex absolute right-4 top-[38%] -translate-y-1/2 z-30 w-10 h-10 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.src}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goToSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === centerIndex ? "w-6 bg-accent" : "w-1.5 bg-black/20"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
