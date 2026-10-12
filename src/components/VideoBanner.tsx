import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VideoBannerContent } from "@/lib/video-banner";

export default function VideoBanner({ content }: { content: VideoBannerContent }) {
  if (!content.video.trim()) return null;

  return (
    <section className="mx-auto max-w-7xl pb-16">
      <div className="relative overflow-hidden rounded-lg bg-black min-h-[22rem] sm:min-h-0 sm:aspect-video">
        <video
          src={content.video}
          poster={content.poster.trim() || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {content.overlay > 0 && (
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{ backgroundColor: `rgba(0,0,0,${content.overlay / 100})` }}
          />
        )}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 sm:gap-4 px-6 text-center text-white">
          {content.heading.trim() && (
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              {content.heading}
            </h2>
          )}
          {content.subheading.trim() && (
            <p className="max-w-2xl text-sm sm:text-base text-white/80">
              {content.subheading}
            </p>
          )}
          {content.ctaLabel.trim() && (
            <Link
              href={content.ctaHref || "/products"}
              className="mt-1 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wide hover:underline underline-offset-4"
            >
              <span>{content.ctaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
