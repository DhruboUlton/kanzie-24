import { BrandStripContent, classNameFor } from "@/lib/brand-strip";

// A row of wordmarks under New Arrivals. The names are whatever the admin
// set in /adpnl/banner — retailers, brands stocked, press, or nothing.
export default function BrandLogoStrip({ content }: { content: BrandStripContent }) {
  if (!content.enabled || content.marks.length === 0) return null;

  return (
    <section className="border-y border-black/10 bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {content.marks.map((mark, i) => (
          <span
            key={`${mark.name}-${i}`}
            className={`text-xl sm:text-2xl text-black/65 hover:text-black/80 transition-colors select-none ${classNameFor(mark.style)}`}
          >
            {mark.name}
          </span>
        ))}
      </div>
    </section>
  );
}
