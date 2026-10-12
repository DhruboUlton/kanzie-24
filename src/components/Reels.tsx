"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InstagramIcon } from "@/components/SocialIcons";
import { Reel, ReelsContent } from "@/lib/reels";

// Plays only while on screen, so a row of clips below the fold costs nothing
// until someone scrolls to it.
function ReelCard({ reel }: { reel: Reel }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => void (e.isIntersecting ? v.play().catch(() => {}) : v.pause()),
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const inner = (
    <>
      <video
        ref={ref}
        src={reel.video}
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <InstagramIcon className="absolute top-3 right-3 w-6 h-6 text-white drop-shadow" />
      {reel.href && (
        // Hover-only on a mouse; on a phone the whole card is the link.
        <span className="absolute inset-x-4 bottom-4 rounded-md bg-white py-3 text-center text-sm font-bold text-gray-900 shadow-md opacity-0 translate-y-2 transition duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0">
          SHOP NOW
        </span>
      )}
    </>
  );
  const card = "group relative block aspect-[4/5] overflow-hidden rounded-lg bg-black";

  return reel.href ? (
    <Link href={reel.href} aria-label="Shop this reel" className={card}>
      {inner}
    </Link>
  ) : (
    <div className={card}>{inner}</div>
  );
}

export default function Reels({ content }: { content: ReelsContent }) {
  const row = useRef<HTMLDivElement>(null);
  // Plain browser scrolling, so touch, trackpad, wheel and keyboard all work;
  // the arrows are only a shortcut for mouse users.
  const scroll = (dir: 1 | -1) =>
    row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: "smooth" });

  if (content.reels.length === 0) return null;

  const handle = content.handle.trim();

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          {content.heading.trim() && (
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide">
              {content.heading}
            </h2>
          )}
          {content.subheading.trim() && (
            <p className="mt-2 text-sm sm:text-base text-gray-600">{content.subheading}</p>
          )}
        </div>
        {(handle || content.followUrl) && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            {handle && <span className="font-bold">{handle}</span>}
            {content.followUrl && (
              <a
                href={content.followUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-gray-900 px-5 py-2 text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors"
              >
                Follow
              </a>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={row}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {content.reels.map((reel, i) => (
            <div
              key={i}
              className="shrink-0 snap-start basis-[70%] sm:basis-[45%] md:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)]"
            >
              <ReelCard reel={reel} />
            </div>
          ))}
        </div>

        {content.reels.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous reels"
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Next reels"
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
