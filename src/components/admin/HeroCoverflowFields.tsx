"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Images,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Type,
  MousePointerClick,
  RotateCcw,
  Palette,
  AlertCircle,
  Library,
} from "lucide-react";
import ColorField from "@/components/admin/ColorField";
import MediaPickerModal from "@/components/admin/media/MediaPickerModal";
import { MediaItem } from "@/components/admin/media/types";
import { DEFAULT_HERO, HeroContent, HeroSlide } from "@/lib/hero";

// Editor for the "coverflow" hero mode: cut-out PNGs rotating over a solid
// background, with one shared headline and CTA for the whole slider.

function isUpload(src: string) {
  return src.startsWith("/api/uploads/");
}

export default function HeroCoverflowFields({
  content,
  setContent,
}: {
  content: HeroContent;
  setContent: React.Dispatch<React.SetStateAction<HeroContent>>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * Append images as new slides, in the order given.
   *
   * Shared by the uploader and the library picker so a slide added either
   * way starts with exactly the same nudge/zoom defaults.
   */
  const appendSlides = (items: { src: string; alt?: string }[]) =>
    setContent((c) => ({
      ...c,
      slides: [
        ...c.slides,
        ...items.map(({ src, alt }) => ({
          src,
          alt: alt ?? "",
          groundOffset: 0,
          leftGap: 0,
          rightGap: 0,
          zoom: 100,
          word: "",
        })),
      ],
    }));

  const setField = <K extends keyof HeroContent>(key: K, value: HeroContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }));

  const setSlide = (index: number, patch: Partial<HeroSlide>) =>
    setContent((c) => ({
      ...c,
      slides: c.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const removeSlide = (index: number) =>
    setContent((c) => ({ ...c, slides: c.slides.filter((_, i) => i !== index) }));

  const moveSlide = (index: number, dir: -1 | 1) =>
    setContent((c) => {
      const target = index + dir;
      if (target < 0 || target >= c.slides.length) return c;
      const slides = [...c.slides];
      [slides[index], slides[target]] = [slides[target], slides[index]];
      return { ...c, slides };
    });

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
        appendSlides([{ src: data.url }]);
      }
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]";

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Headline */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Type className="w-4 h-4 text-accent" />
          <span>Headline</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Line 1 — start
            </label>
            <input
              type="text"
              value={content.headingLead}
              onChange={(e) => setField("headingLead", e.target.value)}
              placeholder="REALISTIC"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Line 1 — highlighted
            </label>
            <input
              type="text"
              value={content.headingAccent}
              onChange={(e) => setField("headingAccent", e.target.value)}
              placeholder="REMOTE CONTROL"
              className={`${inputClass} text-[#c0282b] font-semibold`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Line 2
            </label>
            <input
              type="text"
              value={content.headingTail}
              onChange={(e) => setField("headingTail", e.target.value)}
              placeholder="CONSTRUCTION TOYS"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Subheading
          </label>
          <input
            type="text"
            value={content.subheading}
            onChange={(e) => setField("subheading", e.target.value)}
            placeholder="Big machines. Big fun. Built for little builders."
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <ColorField
            label="Heading colour"
            value={content.headingColor}
            fallback={DEFAULT_HERO.headingColor}
            onChange={(v) => setField("headingColor", v)}
          />
          <ColorField
            label="Highlight colour"
            value={content.headingAccentColor}
            fallback={DEFAULT_HERO.headingAccentColor}
            onChange={(v) => setField("headingAccentColor", v)}
          />
        </div>
      </div>

      {/* Background */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4 text-accent" />
          <span>Background</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField
            label="Background colour"
            value={content.backgroundColor}
            fallback={DEFAULT_HERO.backgroundColor}
            onChange={(v) => setField("backgroundColor", v)}
          />
          <ColorField
            label="Background word colour"
            value={content.watermarkColor}
            fallback={DEFAULT_HERO.watermarkColor}
            onChange={(v) => setField("watermarkColor", v)}
          />
        </div>
        <p className="text-[11px] text-gray-400 -mt-1">
          Each slide carries its own backdrop word (set it with the image
          below). It sits at 5% opacity, so pick a colour with contrast —
          white reads on a dark banner, black on a light one.
        </p>
      </div>

      {/* CTA */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 text-accent" />
          <span>Call to Action</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Button label
            </label>
            <input
              type="text"
              value={content.ctaLabel}
              onChange={(e) => setField("ctaLabel", e.target.value)}
              placeholder="SHOP RC TOYS →"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Links to
            </label>
            <input
              type="text"
              value={content.ctaHref}
              onChange={(e) => setField("ctaHref", e.target.value)}
              placeholder="/products"
              className={`${inputClass} font-mono text-xs`}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              A path on this store (e.g. <code>/products</code> or{" "}
              <code>/products?category=excavators</code>)
            </p>
          </div>
        </div>
      </div>

      {/* Slides */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Images className="w-4 h-4 text-accent" />
            <span>Slider Images ({content.slides.length})</span>
          </h3>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors"
            >
              <Library className="w-4 h-4" />
              <span>Add PNGs from library</span>
            </button>

            <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploading ? "Uploading…" : "Upload PNG"}</span>
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 -mt-2">
          Transparent PNGs work best — the slider sits on a solid background and
          the artwork has no frame around it. You can select several at once.
        </p>

        {content.slides.length === 0 && (
          <p className="text-xs text-gray-500 py-6 text-center">
            No slides yet. Upload at least one image.
          </p>
        )}

        <div className="space-y-3">
          {content.slides.map((slide, i) => (
            <div
              key={`${slide.src}-${i}`}
              className="flex flex-col sm:flex-row gap-4 p-3 rounded-lg border border-gray-200 bg-gray-50/60"
            >
              <div className="relative w-full sm:w-28 h-28 rounded-md bg-paper overflow-hidden shrink-0">
                <Image
                  src={slide.src}
                  alt={slide.alt || `Slide ${i + 1}`}
                  fill
                  sizes="112px"
                  className="object-contain"
                />
                <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-2">
                  <input
                    type="text"
                    value={slide.alt}
                    onChange={(e) => setSlide(i, { alt: e.target.value })}
                    placeholder="Describe the image (for accessibility & SEO)"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
                  />
                  <input
                    type="text"
                    value={slide.word ?? ""}
                    onChange={(e) => setSlide(i, { word: e.target.value })}
                    placeholder="Backdrop word"
                    title="The oversized word shown behind this image"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs uppercase tracking-wide focus:outline-none focus:border-[#c0282b]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ["groundOffset", "Down"],
                      ["leftGap", "Left pad"],
                      ["rightGap", "Right pad"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        value={slide[key]}
                        onChange={(e) =>
                          setSlide(i, {
                            [key]: Number(e.target.value) || 0,
                          } as Partial<HeroSlide>)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#c0282b]"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Zoom %
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={10}
                        max={300}
                        step={5}
                        value={slide.zoom ?? 100}
                        onChange={(e) =>
                          setSlide(i, { zoom: Number(e.target.value) || 100 })
                        }
                        className="w-full min-w-0 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#c0282b]"
                      />
                      {(slide.zoom ?? 100) !== 100 && (
                        <button
                          type="button"
                          onClick={() => setSlide(i, { zoom: 100 })}
                          title="Reset zoom to 100%"
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  Nudges in % to line this image up with the others, plus zoom
                  to match its size. Defaults: 0 nudge, 100% zoom.
                </p>
              </div>

              <div className="flex sm:flex-col items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveSlide(i, -1)}
                  disabled={i === 0}
                  aria-label="Move slide earlier"
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(i, 1)}
                  disabled={i === content.slides.length - 1}
                  aria-label="Move slide later"
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(i)}
                  aria-label="Remove slide"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pick existing artwork instead of re-uploading it. Images only —
          the coverflow renders a still, so a video here would be a dead
          slide. Multiple selection because building a slider is normally
          "these four", not one at a time. */}
      <MediaPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(selected: MediaItem[]) => {
          appendSlides(
            selected
              .filter((m) => m.url?.trim())
              .map((m) => ({ src: m.url, alt: m.altText ?? "" })),
          );
          setPickerOpen(false);
        }}
        allowedTypes={["IMAGE"]}
        multiple
        title="Add slider images from the Media Library"
        confirmText="Add to slider"
        initialSelectedUrls={content.slides.map((s) => s.src)}
      />
    </div>
  );
}
