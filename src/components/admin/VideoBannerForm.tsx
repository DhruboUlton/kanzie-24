"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Type,
  MousePointerClick,
  Eye,
  Film,
} from "lucide-react";
import ImageField from "@/components/admin/ImageField";
import VideoBanner from "@/components/VideoBanner";
import { updateVideoBannerAction } from "@/lib/actions/video-banner";
import { VideoBannerContent } from "@/lib/video-banner";

export default function VideoBannerForm({
  initial,
}: {
  initial: VideoBannerContent;
}) {
  const router = useRouter();
  const [content, setContent] = useState<VideoBannerContent>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setField = <K extends keyof VideoBannerContent>(
    key: K,
    value: VideoBannerContent[K],
  ) => setContent((c) => ({ ...c, [key]: value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateVideoBannerAction(content);
      if (res.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to save video banner");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]";
  const card = "bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4";
  const cardTitle =
    "text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Video Banner</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            The looping video panel under “Shop by machine”. Hidden until a video is chosen.
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
          <span>Save Video Banner</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Video banner saved — the homepage is updated.</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Live Preview
          </h3>
        </div>
        <div className="pt-6 pointer-events-none">
          {content.video.trim() ? (
            <VideoBanner content={content} />
          ) : (
            <p className="pb-6 text-center text-xs text-gray-400">
              Choose a video below to preview it.
            </p>
          )}
        </div>
      </div>

      <div className={card}>
        <h3 className={cardTitle}>
          <Film className="w-4 h-4 text-accent" />
          <span>Video</span>
        </h3>

        <ImageField
          video
          label="Video file"
          value={content.video}
          onChange={(v) => setField("video", v)}
          previewFit="cover"
          previewClassName="h-48"
          hint="Plays muted and on a loop, so no sound is needed. Landscape 16:9 (1920×1080) fits best. Keep it short and under ~10 MB — every visitor downloads it. Clear the field to hide the section."
        />

        <ImageField
          label="Cover image (optional)"
          value={content.poster}
          onChange={(v) => setField("poster", v)}
          previewFit="cover"
          previewClassName="h-32"
          hint="Shown while the video loads. Use a frame from the video."
        />

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Dark overlay — {content.overlay}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={content.overlay}
            onChange={(e) => setField("overlay", Number(e.target.value))}
            className="w-full accent-[#c0282b]"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Darkens the video so the text stays readable. 0% is the bare video.
          </p>
        </div>
      </div>

      <div className={card}>
        <h3 className={cardTitle}>
          <Type className="w-4 h-4 text-accent" />
          <span>Text</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Heading
          </label>
          <input
            type="text"
            value={content.heading}
            onChange={(e) => setField("heading", e.target.value)}
            placeholder="DESK-SIZED. DRIFT-READY."
            className={inputClass}
          />
          <p className="text-[11px] text-gray-400 mt-1">Leave empty to show the video alone.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Subheading
          </label>
          <input
            type="text"
            value={content.subheading}
            onChange={(e) => setField("subheading", e.target.value)}
            placeholder="Scale details, smooth control, and plenty of sideways fun."
            className={inputClass}
          />
        </div>
      </div>

      <div className={card}>
        <h3 className={cardTitle}>
          <MousePointerClick className="w-4 h-4 text-accent" />
          <span>Call to Action</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Link label
            </label>
            <input
              type="text"
              value={content.ctaLabel}
              onChange={(e) => setField("ctaLabel", e.target.value)}
              placeholder="SHOP NOW"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Leave empty to hide the link.</p>
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
      </div>
    </form>
  );
}
