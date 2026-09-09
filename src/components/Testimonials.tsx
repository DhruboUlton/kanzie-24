"use client";

import { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import ReviewerAvatar from "@/components/ReviewerAvatar";
import { Testimonial, DEFAULT_TESTIMONIALS } from "@/lib/testimonials";

export default function Testimonials({
  items,
}: {
  items?: Testimonial[];
}) {
  // `items` absent means the caller has nothing to say about reviews, so the
  // presets stand in. An empty array is a decision — every review deleted or
  // hidden — and the section disappears instead of quietly republishing six
  // invented customers.
  const testimonials = items ?? DEFAULT_TESTIMONIALS;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false,
    dragFree: false,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;

    // Reading the initial snapshot out of an imperative carousel API is the
    // one case this rule cannot express: the snap list does not exist until
    // Embla has measured the DOM, and every later change does arrive through
    // the subscriptions below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollSnaps(emblaApi.scrollSnapList());

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    const onReInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    const onPointerDown = () => setIsPaused(true);
    const onPointerUp = () => setIsPaused(false);

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onReInit);
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);

    return () => {
      // reInit was named inline before and so could never be removed here,
      // leaving one more listener behind on every re-run.
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onReInit);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
    };
  }, [emblaApi]);

  // Auto-advance sliding horizontally from right to left every 4 seconds
  useEffect(() => {
    if (!emblaApi || isPaused) return;

    // Respect user's prefers-reduced-motion setting
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);

    return () => clearInterval(timer);
  }, [emblaApi, isPaused]);

  // Every hook above runs unconditionally; only the markup is skipped. With
  // no reviews to show there is nothing worth a heading and a pair of arrows,
  // so the whole section stands down.
  if (testimonials.length === 0) return null;

  return (
    <section
      className="bg-white py-16 sm:py-20 overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Customer Testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <p className="text-xs font-bold tracking-widest text-accent uppercase mb-1 text-center sm:text-left">
              Real Customer Stories
            </p>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wide text-ink text-center sm:text-left">
              WHAT OUR CUSTOMERS SAY
            </h2>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2" aria-label="Carousel navigation">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous testimonial"
              className="p-2.5 rounded-full bg-white hover:bg-gray-50 text-ink/80 hover:text-ink border border-gray-200 shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next testimonial"
              className="p-2.5 rounded-full bg-white hover:bg-gray-50 text-ink/80 hover:text-ink border border-gray-200 shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel Track Viewport */}
        <div className="overflow-hidden -mx-5 sm:-mx-6 px-5 sm:px-6 -my-4" ref={emblaRef}>
          <div className="flex -ml-5 sm:-ml-6 items-stretch">
            {testimonials.map((t, index) => (
              <div
                key={`${t.id || t.name}-${index}`}
                className="min-w-0 shrink-0 grow-0 pl-5 sm:pl-6 basis-full sm:basis-1/2 lg:basis-1/3 flex pt-4 pb-14"
              >
                <figure className="w-full flex flex-col justify-between bg-white rounded-2xl p-6 sm:p-7 border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.11),0_2px_6px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative group">
                  {/* Top: Star Rating & Quote */}
                  <div className="flex-1 flex flex-col">
                    <div
                      className="flex items-center gap-1 mb-4 text-amber-500"
                      // Read from the review rather than hardcoded: a
                      // three-star review used to announce five.
                      aria-label={`${t.rating ?? 5} out of 5 stars`}
                    >
                      {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 fill-current"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    <blockquote className="text-[15px] sm:text-base leading-relaxed text-ink/85 italic">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  </div>

                  {/* Bottom: Name + Role on Left, 56px Circular Headshot anchored on Right */}
                  <figcaption className="mt-6 pt-5 border-t border-gray-100 flex items-end justify-between gap-3">
                    <div className="min-w-0 pr-2">
                      <div className="font-display tracking-wider text-sm font-bold text-ink uppercase truncate">
                        {t.name}
                      </div>
                      {t.role && (
                        <div className="text-xs text-black/55 font-medium mt-0.5 truncate">
                          {t.role}
                        </div>
                      )}
                    </div>

                    {/* Circular headshot: exactly 56px x 56px (w-14 h-14).
                        Falls back to the reviewer's initial when no photo
                        was chosen. */}
                    <div className="shrink-0">
                      <ReviewerAvatar
                        name={t.name}
                        avatar={t.avatar}
                        size={56}
                        className="w-14 h-14 border-2 border-gray-100 shadow-xs ring-1 ring-black/5 group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel pagination indicators */}
        {/* Not aria-hidden: these are real buttons, and hiding focusable
            controls from assistive technology strands anyone tabbing
            through them on a control their reader cannot describe. */}
        <div className="flex justify-center items-center gap-2 -mt-4 mb-2">
          {scrollSnaps.map((_, snapIdx) => (
            <button
              key={snapIdx}
              type="button"
              onClick={() => scrollTo(snapIdx)}
              aria-label={`Go to slide group ${snapIdx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                selectedIndex === snapIdx
                  ? "w-8 bg-accent"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
