import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function FeatureBanner() {
  return (
    <section className="bg-ink text-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
        <div className="grid grid-cols-12 gap-3 sm:gap-6 lg:gap-8 items-center">
          {/* Left Column: Eyebrow, Heading, Subhead, CTA */}
          <div className="col-span-5 sm:col-span-5 lg:col-span-5 space-y-2 sm:space-y-3.5 text-left z-10">
            <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold tracking-wider uppercase bg-white/10 text-white/90">
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent fill-accent" />
              <span>Full Hydraulic Action</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight text-white font-extrabold leading-[1.05]">
              DIG. HAUL. <br className="sm:hidden" />
              <span className="text-accent">BUILD.</span>
            </h2>

            {/* Subhead / Tagline */}
            <p className="text-[11px] sm:text-xs md:text-sm text-white/70 leading-snug sm:leading-relaxed max-w-md line-clamp-2 sm:line-clamp-none">
              Real hydraulic articulation, metal attachments, and 2.4GHz multi-channel controls.
            </p>

            <div className="pt-0.5 sm:pt-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-accent hover:bg-accent-dark text-white font-bold text-xs sm:text-sm rounded-md transition-all shadow-md shrink-0"
              >
                <span>SHOP MACHINES</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-white/60">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                <span>1-Year Official Warranty</span>
              </div>
            </div>
          </div>

          {/* Right Column: Larger Middle-aligned Product Image */}
          <div className="col-span-7 sm:col-span-7 lg:col-span-7 relative flex items-center justify-center">
            <div className="relative w-full h-60 sm:h-72 md:h-[400px] lg:h-[480px] transition-transform duration-500 hover:scale-105">
              <Image
                src="/hero/jcb-backhoe-loader-2.png"
                alt="RC Construction Heavy Machine"
                fill
                sizes="(min-width: 1024px) 65vw, 60vw"
                className="object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
