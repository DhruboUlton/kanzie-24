"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  GalleryHorizontal,
} from "lucide-react";
import HeroCoverflowFields from "@/components/admin/HeroCoverflowFields";
import HeroBannerSlidesFields from "@/components/admin/HeroBannerSlidesFields";
import HeroSlider from "@/components/HeroSlider";
import HeroBannerSlider from "@/components/HeroBannerSlider";
import { updateHeroAction } from "@/lib/actions/hero";
import { HeroContent, HeroMode, hasRenderableBanner } from "@/lib/hero";

// The two hero styles are mutually exclusive by construction: one stored
// mode, one segmented control. There's no way to express "both on".
const MODES: {
  id: HeroMode;
  label: string;
  blurb: string;
  icon: typeof Layers;
}[] = [
  {
    id: "coverflow",
    label: "Product Slider",
    blurb: "Cut-out PNGs rotating over a solid colour, with one shared headline",
    icon: Layers,
  },
  {
    id: "banner",
    label: "Banner Slider",
    blurb: "Full-width banner images, each with its own optional text and button",
    icon: GalleryHorizontal,
  },
];

export default function HeroBannerForm({ initial }: { initial: HeroContent }) {
  const router = useRouter();
  const [content, setContent] = useState<HeroContent>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateHeroAction(content);
      if (res.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to save banner");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const bannerReady = hasRenderableBanner(content);
  const bannerSelectedButEmpty = content.mode === "banner" && !bannerReady;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Hero Banner</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            The slider at the very top of the storefront
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Banner</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Banner saved — the homepage is updated.</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Style picker — exactly one is live at a time */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
          Hero Style
        </h3>
        <p className="text-[11px] text-gray-400 -mt-1">
          Only one shows on the homepage. Switching keeps the other one&apos;s
          setup saved, so you can flip back any time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map(({ id, label, blurb, icon: Icon }) => {
            const active = content.mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setContent((c) => ({ ...c, mode: id }))}
                aria-pressed={active}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  active
                    ? "border-[#c0282b] bg-[#c0282b]/5"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-4 h-4 ${active ? "text-[#c0282b]" : "text-gray-400"}`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      active ? "text-[#c0282b]" : "text-gray-900"
                    }`}
                  >
                    {label}
                  </span>
                  {active && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-white bg-[#c0282b] px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  {blurb}
                </p>
              </button>
            );
          })}
        </div>

        {bannerSelectedButEmpty && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>
              Banner Slider is selected but has no images yet — the homepage
              keeps showing the Product Slider until you add one below.
            </span>
          </div>
        )}
      </div>

      {/* Live preview of whichever style is selected */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Live Preview
          </h3>
          <span className="text-[11px] text-gray-400 ml-1">
            exactly how the homepage renders these values
          </span>
        </div>
        {/* Height tracks the mode — the banner is a shorter strip than the
            coverflow, and a fixed box left dead space under it. */}
        <div
          className={`relative overflow-hidden pointer-events-none ${
            bannerReady ? "h-[18rem]" : "h-[26rem]"
          }`}
        >
          <div className="absolute top-0 left-0 origin-top-left scale-[0.55] w-[181.8%]">
            {bannerReady ? (
              <HeroBannerSlider content={content} />
            ) : (
              <HeroSlider content={content} />
            )}
          </div>
        </div>
      </div>

      {content.mode === "banner" ? (
        <HeroBannerSlidesFields content={content} setContent={setContent} />
      ) : (
        <HeroCoverflowFields content={content} setContent={setContent} />
      )}
    </form>
  );
}
