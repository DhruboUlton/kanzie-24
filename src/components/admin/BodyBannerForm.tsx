"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Type,
  Palette,
  MousePointerClick,
  Eye,
  ImageIcon,
} from "lucide-react";
import ColorField from "@/components/admin/ColorField";
import ImageField from "@/components/admin/ImageField";
import FeatureBanner from "@/components/FeatureBanner";
import { updateBodyBannerAction } from "@/lib/actions/body-banner";
import { BodyBannerContent, DEFAULT_BODY_BANNER } from "@/lib/body-banner";

export default function BodyBannerForm({
  initial,
}: {
  initial: BodyBannerContent;
}) {
  const router = useRouter();
  const [content, setContent] = useState<BodyBannerContent>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setField = <K extends keyof BodyBannerContent>(
    key: K,
    value: BodyBannerContent[K],
  ) => setContent((c) => ({ ...c, [key]: value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateBodyBannerAction(content);
      if (res.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to save body banner");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Body Banner</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            The wide promo strip further down the homepage
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
          <span>Save Body Banner</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Body banner saved — the homepage is updated.</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live preview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Live Preview
          </h3>
        </div>
        <div className="relative h-[19rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 origin-top-left scale-[0.55] w-[181.8%]">
            <FeatureBanner content={content} />
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Type className="w-4 h-4 text-accent" />
          <span>Text</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Small label above the heading
          </label>
          <input
            type="text"
            value={content.eyebrow}
            onChange={(e) => setField("eyebrow", e.target.value)}
            placeholder="Full Hydraulic Action"
            className={inputClass}
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Leave empty to hide the pill entirely.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Heading
            </label>
            <input
              type="text"
              value={content.headingLead}
              onChange={(e) => setField("headingLead", e.target.value)}
              placeholder="DIG. HAUL."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Heading — highlighted
            </label>
            <input
              type="text"
              value={content.headingAccent}
              onChange={(e) => setField("headingAccent", e.target.value)}
              placeholder="BUILD."
              className={`${inputClass} text-[#c0282b] font-semibold`}
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
            placeholder="Real hydraulic articulation, metal attachments…"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField
            label="Text colour"
            value={content.headingColor}
            fallback={DEFAULT_BODY_BANNER.headingColor}
            onChange={(v) => setField("headingColor", v)}
          />
          <ColorField
            label="Highlight colour"
            value={content.headingAccentColor}
            fallback={DEFAULT_BODY_BANNER.headingAccentColor}
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

        <div className="inline-flex p-1 bg-gray-100 rounded-lg">
          {(
            [
              ["color", "Solid colour"],
              ["image", "Image"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setField("backgroundType", value)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                content.backgroundType === value
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ColorField
          label={
            content.backgroundType === "image"
              ? "Fallback colour (shows while the image loads)"
              : "Background colour"
          }
          value={content.backgroundColor}
          fallback={DEFAULT_BODY_BANNER.backgroundColor}
          onChange={(v) => setField("backgroundColor", v)}
        />

        {content.backgroundType === "image" && (
          <>
            <ImageField
              label="Background image"
              value={content.backgroundImage}
              onChange={(v) => setField("backgroundImage", v)}
              previewFit="cover"
              previewClassName="h-40"
              hint="Full-width band, so use a wide image — around 1920×640 (3:1) works well; anything from 2.5:1 to 4:1 is safe. It's cropped from the centre, so keep the important part in the middle and avoid text baked into the image. Under ~400 KB keeps the page fast."
            />

            {/* Only offered for an image background — over a solid colour
                this would just darken the colour set above. */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Dark overlay — {content.backgroundOverlay}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={content.backgroundOverlay}
                onChange={(e) =>
                  setField("backgroundOverlay", Number(e.target.value))
                }
                className="w-full accent-[#c0282b]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Darkens the photo so the heading and button stay readable. 0% is
                the bare image; around 35–50% suits a bright photo.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Product cut-out */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-accent" />
          <span>Product Image</span>
        </h3>

        <ImageField
          label="Cut-out PNG (optional)"
          value={content.image}
          onChange={(v) => setField("image", v)}
          hint="Transparent PNG of the machine, shown on the right. Leave it empty and the text simply spans the full width instead — no gap left behind."
        />
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
              placeholder="SHOP MACHINES"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Leave empty to hide the button.
            </p>
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
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Note beside the button
          </label>
          <input
            type="text"
            value={content.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder="1-Year Official Warranty"
            className={inputClass}
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Shown on larger screens only. Leave empty to hide it.
          </p>
        </div>
      </div>
    </form>
  );
}
