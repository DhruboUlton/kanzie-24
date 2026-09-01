"use client";

import { useState } from "react";
import {
  Images,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
} from "lucide-react";
import ColorField from "@/components/admin/ColorField";
import {
  BANNER_ALIGNMENTS,
  BannerAlign,
  BannerSlide,
  DEFAULT_BANNER_SLIDE,
  HeroContent,
} from "@/lib/hero";

// Editor for the "banner" hero mode: one full-width image per slide, each
// with its own optional heading / subheading / CTA laid over it.

const ALIGN_ICON: Record<BannerAlign, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

export default function HeroBannerSlidesFields({
  content,
  setContent,
}: {
  content: HeroContent;
  setContent: React.Dispatch<React.SetStateAction<HeroContent>>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slides = content.bannerSlides;

  const setSlide = (index: number, patch: Partial<BannerSlide>) =>
    setContent((c) => ({
      ...c,
      bannerSlides: c.bannerSlides.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      ),
    }));

  const removeSlide = (index: number) =>
    setContent((c) => ({
      ...c,
      bannerSlides: c.bannerSlides.filter((_, i) => i !== index),
    }));

  const moveSlide = (index: number, dir: -1 | 1) =>
    setContent((c) => {
      const target = index + dir;
      if (target < 0 || target >= c.bannerSlides.length) return c;
      const next = [...c.bannerSlides];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...c, bannerSlides: next };
    });

  const addSlide = (src: string) =>
    setContent((c) => ({
      ...c,
      bannerSlides: [...c.bannerSlides, { ...DEFAULT_BANNER_SLIDE, src }],
    }));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        addSlide(data.url);
      }
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const inputClass =
    "w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]";

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Images className="w-4 h-4 text-accent" />
            <span>Banner Images ({slides.length})</span>
          </h3>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => addSlide("")}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors"
            >
              <Link2 className="w-4 h-4" />
              <span>Add by URL</span>
            </button>
            <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploading ? "Uploading…" : "Upload banner"}</span>
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg,image/avif"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-[11px] text-amber-900 leading-relaxed">
            <strong>Image size:</strong> these run edge-to-edge, so use wide
            artwork — around <strong>1920×640 (3:1)</strong> is the sweet spot,
            and anything from 2.5:1 to 4:1 crops cleanly. The image is cropped
            from the centre, so keep the machine and any baked-in text in the
            middle third. Under ~400&nbsp;KB each keeps the homepage fast.
          </p>
        </div>

        {slides.length === 0 && (
          <p className="text-xs text-gray-500 py-6 text-center">
            No banner images yet. Upload one — the text over it is optional.
          </p>
        )}

        <div className="space-y-4">
          {slides.map((slide, i) => {
            const empty =
              !slide.heading.trim() &&
              !slide.subheading.trim() &&
              !slide.ctaLabel.trim();

            return (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-gray-50/60 overflow-hidden"
              >
                {/* Preview strip + reordering */}
                <div className="flex items-start gap-3 p-3">
                  <div className="relative w-32 sm:w-44 h-20 rounded-md bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:12px_12px] overflow-hidden shrink-0">
                    {slide.src.trim() ? (
                      // Plain <img>: the source may be an upload served from
                      // outside the app root, or an arbitrary pasted URL —
                      // neither resolves through the image optimizer.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slide.src}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400 px-2 text-center">
                        Paste an image URL below
                      </div>
                    )}
                    <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      value={slide.src}
                      onChange={(e) => setSlide(i, { src: e.target.value })}
                      placeholder="https://… or upload a file"
                      className={`${inputClass} font-mono`}
                    />
                    <input
                      type="text"
                      value={slide.alt}
                      onChange={(e) => setSlide(i, { alt: e.target.value })}
                      placeholder="Describe the image (for accessibility & SEO)"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveSlide(i, -1)}
                      disabled={i === 0}
                      aria-label="Move banner earlier"
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(i, 1)}
                      disabled={i === slides.length - 1}
                      aria-label="Move banner later"
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(i)}
                      aria-label="Remove banner"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Optional overlay copy */}
                <div className="border-t border-gray-200 bg-white px-3 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Text over this image — optional
                    </h4>
                    {empty && (
                      <span className="text-[10px] text-gray-400">
                        all blank → image only
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={slide.heading}
                    onChange={(e) => setSlide(i, { heading: e.target.value })}
                    placeholder="Heading (leave empty for none)"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={slide.subheading}
                    onChange={(e) => setSlide(i, { subheading: e.target.value })}
                    placeholder="Subheading (leave empty for none)"
                    className={inputClass}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={slide.ctaLabel}
                      onChange={(e) => setSlide(i, { ctaLabel: e.target.value })}
                      placeholder="Button label (leave empty for no button)"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={slide.ctaHref}
                      onChange={(e) => setSlide(i, { ctaHref: e.target.value })}
                      placeholder="/products"
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  {/* Placement + readability — no effect on an image-only slide */}
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 transition-opacity ${
                      empty ? "opacity-50" : ""
                    }`}
                  >
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Position
                      </label>
                      <div className="inline-flex p-1 bg-gray-100 rounded-lg">
                        {BANNER_ALIGNMENTS.map((value) => {
                          const Icon = ALIGN_ICON[value];
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setSlide(i, { align: value })}
                              aria-label={`Align text ${value}`}
                              title={`Align text ${value}`}
                              className={`p-1.5 rounded-md transition-colors ${
                                slide.align === value
                                  ? "bg-white text-gray-900 shadow-xs"
                                  : "text-gray-500 hover:text-gray-900"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <ColorField
                      label="Text colour"
                      value={slide.textColor}
                      fallback={DEFAULT_BANNER_SLIDE.textColor}
                      onChange={(v) => setSlide(i, { textColor: v })}
                    />

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Dark overlay — {slide.overlay}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={slide.overlay}
                        onChange={(e) =>
                          setSlide(i, { overlay: Number(e.target.value) })
                        }
                        className="w-full accent-[#c0282b]"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Darkens the image so the text stays readable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
