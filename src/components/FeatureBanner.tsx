import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { BodyBannerContent } from "@/lib/body-banner";

export default function FeatureBanner({
  content,
}: {
  content: BodyBannerContent;
}) {
  const hasImage = content.image.trim().length > 0;
  const useBackgroundImage =
    content.backgroundType === "image" && content.backgroundImage.trim().length > 0;
  const hasHeading =
    content.headingLead.trim().length > 0 || content.headingAccent.trim().length > 0;
  const hasSubheading = content.subheading.trim().length > 0;

  // The cut-out column is the only thing in this grid with a height, so
  // removing it collapses the strip to the height of the copy — which reads
  // as a squashed band across a full-bleed photo, not a banner. Hold it near
  // the height the cut-out would have given it, but only when there's a
  // photo to show: a flat colour behind two lines of copy is fine compact.
  const needsFloor = useBackgroundImage && !hasImage;

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: content.backgroundColor }}
    >
      {/* Drawn with next/image rather than a CSS background, which the
          optimiser never sees: this was shipping the original upload at full
          size — 282KB of the homepage — where a resized AVIF is a fraction of
          that. Same-origin only, matching the cut-out below: an external URL
          the optimiser cannot resolve falls back to a plain img. */}
      {useBackgroundImage &&
        (content.backgroundImage.startsWith("/") ? (
          <Image
            src={content.backgroundImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ))}
      {useBackgroundImage && content.backgroundOverlay > 0 && (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ backgroundColor: `rgba(0,0,0,${content.backgroundOverlay / 100})` }}
        />
      )}
      {/* relative, so the copy paints above the photo and its scrim. Both of
          those are positioned, and a static sibling would sit under them. */}
      <div
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14 ${
          needsFloor ? "flex items-center min-h-[16rem] sm:min-h-[20rem] lg:min-h-[24rem]" : ""
        }`}
      >
        <div className="w-full grid grid-cols-12 gap-3 sm:gap-6 lg:gap-8 items-center">
          {/* Copy — takes the full width when there's no cut-out image */}
          <div
            className={`${
              hasImage ? "col-span-5" : "col-span-12 max-w-2xl"
            } space-y-2 sm:space-y-3.5 text-left z-10`}
          >
            {content.eyebrow.trim().length > 0 && (
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold tracking-wider uppercase bg-white/10 text-white/90">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent fill-accent" />
                <span>{content.eyebrow}</span>
              </div>
            )}

            {hasHeading && (
              <h2
                className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-extrabold leading-[1.05]"
                style={{ color: content.headingColor }}
              >
                {content.headingLead.trim() && (
                  <>
                    {content.headingLead}{" "}
                    {content.headingAccent.trim() && <br className="sm:hidden" />}
                  </>
                )}
                {content.headingAccent.trim() && (
                  <span style={{ color: content.headingAccentColor }}>
                    {content.headingAccent}
                  </span>
                )}
              </h2>
            )}

            {hasSubheading && (
              <p
                className="text-[11px] sm:text-xs md:text-sm leading-snug sm:leading-relaxed max-w-md line-clamp-2 sm:line-clamp-none"
                style={{ color: content.headingColor, opacity: 0.7 }}
              >
                {content.subheading}
              </p>
            )}

            <div className="pt-0.5 sm:pt-1 flex flex-wrap items-center gap-2 sm:gap-3">
              {content.ctaLabel.trim().length > 0 && (
                <Link
                  href={content.ctaHref || "/products"}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-accent hover:bg-accent-dark text-white font-bold text-xs sm:text-sm rounded-md transition-all shadow-md shrink-0"
                >
                  <span>{content.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              {content.note.trim().length > 0 && (
                <div
                  className="hidden md:flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: content.headingColor, opacity: 0.6 }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>{content.note}</span>
                </div>
              )}
            </div>
          </div>

          {hasImage && (
            <div className="col-span-7 relative flex items-center justify-center">
              <div className="relative w-full h-60 sm:h-72 md:h-[400px] lg:h-[480px] transition-transform duration-500 hover:scale-105">
                {/* Same-origin sources go through the optimizer, which is
                    what stops a 1400px banner PNG being shipped whole to a
                    phone showing it at 210px. Uploads count as same-origin:
                    /api/uploads serves them over HTTP, which the optimizer
                    fetches like any other path. Only an arbitrary external
                    URL, which it cannot resolve, falls back to a plain img. */}
                {content.image.startsWith("/") ? (
                  <Image
                    src={content.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 60vw, (max-width: 1024px) 45vw, 480px"
                    className="object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={content.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
