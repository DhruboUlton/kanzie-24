"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BannerSlide, HeroContent } from "@/lib/hero";

// The "banner" hero mode: full-bleed artwork, one image per slide, with
// optional copy laid over it. Every text field is optional — a slide with
// none is just the image, which is how most shops ship banner art (the
// copy is already baked into the file).
//
// Deliberately a crossfade rather than the coverflow's translate: banner
// images are edge-to-edge, so any horizontal motion shows the neighbouring
// image's edge mid-transition.

const AUTOPLAY_MS = 5000;

// Same reasoning as the coverflow hero: the first crossfade is held back
// past the window Speed Index is measured over, so a full-viewport image
// swap mid-measurement is not read as the page still loading.
const FIRST_AUTOPLAY_MS = 7000;

const ALIGN_CLASS: Record<BannerSlide["align"], string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const VALIGN_CLASS: Record<BannerSlide["vAlign"], string> = {
  top: "items-start pt-8 sm:pt-12",
  middle: "items-center",
  // Padding clears the pagination dots at bottom-5, which would otherwise
  // sit on top of the last line of copy.
  bottom: "items-end pb-12 sm:pb-14",
};

// The overlay slider stays the strength of the darkest end, so an existing
// slide's saved percentage still means the same thing where the text
// actually sits. rgba(0,0,0,0), not `transparent` — same value, but no grey
// midpoint in older Safari's gradient interpolation.
function scrimBackground(scrim: BannerSlide["scrim"], overlay: number): string {
  const a = overlay / 100;
  const c = (m: number) => `rgba(0,0,0,${+(a * m).toFixed(3)})`;
  switch (scrim) {
    case "left":
      return `linear-gradient(to right, ${c(1)} 0%, ${c(0.8)} 30%, ${c(0.25)} 65%, ${c(0)} 90%)`;
    case "right":
      return `linear-gradient(to left, ${c(1)} 0%, ${c(0.8)} 30%, ${c(0.25)} 65%, ${c(0)} 90%)`;
    case "solid":
      return c(1);
    case "bottom":
    default:
      return `linear-gradient(to top, ${c(1)} 0%, ${c(0.75)} 30%, ${c(0.2)} 70%, ${c(0)} 95%)`;
  }
}

function hasCopy(slide: BannerSlide) {
  return Boolean(
    slide.heading.trim() ||
      slide.subheading.trim() ||
      slide.ctaLabel.trim(),
  );
}

export default function HeroBannerSlider({
  content,
}: {
  content: HeroContent;
}) {
  // A row added by "Add by URL" in the admin has no src until one is
  // pasted; next/image throws on an empty src, so never render those.
  const slides = content.bannerSlides.filter((s) => s.src.trim());
  const n = slides.length;
  const [index, setIndex] = useState(0);

  // Removing a slide in the admin preview can leave the stored index past
  // the end, so clamp on the way out rather than correcting it in an effect.
  const current = n > 0 && index < n ? index : 0;

  const goTo = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);
  const goPrev = useCallback(() => goTo(current - 1), [goTo, current]);
  const goNext = useCallback(() => goTo(current + 1), [goTo, current]);

  useEffect(() => {
    if (n < 2) return;
    const advance = () => setIndex((i) => (i + 1) % n);
    let id: ReturnType<typeof setInterval> | null = null;
    const kickoff = setTimeout(() => {
      advance();
      id = setInterval(advance, AUTOPLAY_MS);
    }, FIRST_AUTOPLAY_MS);
    return () => {
      clearTimeout(kickoff);
      if (id) clearInterval(id);
    };
  }, [n]);

  if (n === 0) return null;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: content.backgroundColor }}
    >
      {/* Ratio-driven height so the artwork is never cropped differently
          than the admin preview promised. Taller on phones so a wide image
          doesn't collapse to a letterbox sliver. */}
      <div className="relative w-full h-[20rem] sm:h-[24rem] lg:h-[32rem]">
        {slides.map((slide, i) => {
          const active = i === current;
          const copy = hasCopy(slide);

          return (
            <div
              key={`${slide.src}-${i}`}
              aria-hidden={!active}
              // inert as well as aria-hidden: the inactive slides keep their
              // CTA link in the DOM, and hiding a focusable element from the
              // accessibility tree without removing it from the tab order
              // strands keyboard users on a slide they cannot see.
              inert={!active}
              className="absolute inset-0"
              style={{
                opacity: active ? 1 : 0,
                zIndex: active ? 2 : 1,
                pointerEvents: active ? "auto" : "none",
                transition: "opacity 600ms ease-out",
              }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover"
              />

              {/* Scrim only where there's text to protect. */}
              {copy && slide.overlay > 0 && (
                <div
                  className="absolute inset-0"
                  style={{ background: scrimBackground(slide.scrim, slide.overlay) }}
                />
              )}

              {copy && (
                <div className={`absolute inset-0 flex ${VALIGN_CLASS[slide.vAlign]}`}>
                  <div
                    className={`mx-auto w-full max-w-7xl px-6 sm:px-10 flex flex-col gap-3 sm:gap-4 ${
                      ALIGN_CLASS[slide.align]
                    }`}
                  >
                    <div
                      className="max-w-xl lg:max-w-2xl flex flex-col gap-2 sm:gap-3"
                      style={{ color: slide.textColor }}
                    >
                      {slide.heading.trim() && (
                        <h1 className="font-display text-2xl sm:text-5xl lg:text-6xl tracking-wide leading-[1.1] sm:leading-[1.05] whitespace-pre-line">
                          {slide.heading}
                        </h1>
                      )}
                      {slide.subheading.trim() && (
                        <p className="text-base sm:text-xl lg:text-2xl leading-snug opacity-90 whitespace-pre-line">
                          {slide.subheading}
                        </p>
                      )}
                    </div>

                    {slide.ctaLabel.trim() && (
                      <Link
                        href={slide.ctaHref.trim() || "/products"}
                        className="inline-block bg-accent hover:bg-accent-dark transition-colors text-white font-display tracking-wide text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded w-fit"
                      >
                        {slide.ctaLabel}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous slide"
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goNext}
            aria-label="Next slide"
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow"
          >
            <ChevronRight size={20} />
          </button>

          {/* Buttons are 24px square — the dot itself stays small, but a
              5px tap target is unusable on a phone and fails WCAG 2.5.8.
              Sized in px, not rem: globals.css sets html{font-size:87.5%},
              so Tailwind's h-6 would land at 21px and still miss the bar. */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-1">
            {slides.map((slide, i) => (
              <button
                key={`${slide.src}-${i}`}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className="h-[24px] min-w-[24px] flex items-center justify-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === current ? "w-6 bg-accent" : "w-1.5 bg-white/60"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
