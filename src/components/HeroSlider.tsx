"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroContent } from "@/lib/hero";

// Slides, headline and CTA come from /admin/banner (see src/lib/hero.ts);
// DEFAULT_HERO is what ships if nothing has been saved yet.
//
// Each transparent PNG carries a different amount of empty space around the
// vehicle, so per-slide nudges (as % of the frame) line the machines up
// with each other rather than with their canvas edges:
//   - groundOffset pushes the box down so wheels/tracks align.
//   - leftGap/rightGap correct side spacing, applied inward-side-only (see
//     sideGap below), so the *vehicle* sits a consistent distance from
//     centre regardless of how tightly it was cropped.

const TRANSITION_MS = 500;

// Shortest signed distance from `index` to `i` on a ring of size `n`.
function ringOffset(i: number, n: number) {
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
function recycle(o: number, n: number) {
  if (o <= -n / 2) return o + n;
  if (o > n / 2) return o - n;
  return o;
}

export default function HeroSlider({ content }: { content: HeroContent }) {
  const SLIDES = content.slides;
  const n = SLIDES.length;

  const [offsets, setOffsets] = useState<number[]>(() =>
    SLIDES.map((_, i) => ringOffset(i, SLIDES.length)),
  );
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shift = useCallback((getDelta: (prev: number[]) => number[]) => {
    setOffsets(getDelta);
    if (recycleRef.current) clearTimeout(recycleRef.current);
    recycleRef.current = setTimeout(() => {
      setOffsets((prev) => prev.map((o) => recycle(o, n)));
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
  // The backdrop word belongs to whichever slide is currently centred.
  const activeWord = (SLIDES[centerIndex]?.word ?? "").trim();

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: content.backgroundColor }}
    >
      {activeWord.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span
            className="font-display text-[26vw] leading-none whitespace-nowrap"
            style={{ color: content.watermarkColor, opacity: 0.05 }}
          >
            {activeWord}
          </span>
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10 py-16 sm:py-20">
        <div className="relative z-20 text-center mb-4">
          <h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide leading-[1.05]"
            style={{ color: content.headingColor }}
          >
            {content.headingLead}{" "}
            <span style={{ color: content.headingAccentColor }}>
              {content.headingAccent}
            </span>
            <br />
            {content.headingTail}
          </h1>
          <p className="mt-4 text-sm sm:text-lg text-ink/70">
            {content.subheading}
          </p>
        </div>

        <div className="relative h-80 sm:h-[30rem] max-w-sm sm:max-w-xl mx-auto">
          {SLIDES.map((slide, i) => {
            const offset = offsets[i];
            const isCenter = offset === 0;
            const abs = Math.abs(offset);

            // Per-slide zoom rides on top of the coverflow scaling.
            const scale = (isCenter ? 1.25 : 0.5) * ((slide.zoom ?? 100) / 100);
            const opacity = abs > 1 ? 0 : isCenter ? 1 : 0.8;
            const zIndex = 10 - abs;

            // Gap facing the center: a left-side slide's inward edge is its
            // right edge, and vice versa. Only push outward for whatever
            // padding this slide has beyond the tightest-cropped image.
            const sideGap = offset < 0 ? slide.rightGap : offset > 0 ? slide.leftGap : 0;
            // Each slide's nudge stands alone — no cross-slide reference, so
            // editing one slide in /admin/banner never moves the others.
            const sideCorrection = Math.sign(offset) * sideGap;

            return (
              <button
                key={slide.src}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                aria-hidden={!isCenter}
                tabIndex={isCenter ? -1 : 0}
                onClick={() => !isCenter && goToSlide(i)}
                className="absolute inset-0 flex items-end justify-center pb-14 sm:pb-20"
                style={{
                  zIndex,
                  cursor: isCenter ? "default" : "pointer",
                  pointerEvents: abs > 1 ? "none" : "auto",
                }}
              >
                <div
                  className={`relative w-80 h-80 sm:w-[30rem] sm:h-[30rem] ${
                    isCenter ? "drop-shadow-xl" : ""
                  }`}
                  style={{
                    // Flanks and center now share the same pb-14/20 anchor
                    // (see className above) — center's extra drop is folded
                    // in here instead of a separate padding class, so it's
                    // part of the animated transform rather than an instant,
                    // untransitioned jump the moment a slide becomes center.
                    transform: `translateY(${slide.groundOffset + (isCenter ? 23 : 0)}%) translateX(${offset * 64 + sideCorrection}%) scale(${scale})`,
                    transformOrigin: "bottom",
                    opacity,
                    willChange: "transform, opacity",
                    transition: "transform 500ms ease-out, opacity 500ms ease-out",
                  }}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes="(max-width: 640px) 320px, 480px"
                    priority={isCenter}
                    unoptimized={slide.src.startsWith("/api/uploads/")}
                    className="object-contain"
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative z-20 flex flex-col items-center text-center mt-2">
          <Link
            href={content.ctaHref || "/products"}
            className="inline-block bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide px-8 py-3 rounded"
          >
            {content.ctaLabel}
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
