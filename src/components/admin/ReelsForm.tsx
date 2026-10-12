"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
} from "lucide-react";
import ImageField from "@/components/admin/ImageField";
import Reels from "@/components/Reels";
import { updateReelsAction } from "@/lib/actions/reels";
import { MAX_REELS, Reel, ReelsContent } from "@/lib/reels";

export default function ReelsForm({ initial }: { initial: ReelsContent }) {
  const router = useRouter();
  const [content, setContent] = useState<ReelsContent>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setField = <K extends keyof ReelsContent>(key: K, value: ReelsContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }));

  const setReels = (reels: Reel[]) => setField("reels", reels);

  const updateReel = (index: number, patch: Partial<Reel>) =>
    setReels(content.reels.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const moveReel = (from: number, to: number) => {
    if (to < 0 || to >= content.reels.length) return;
    const next = content.reels.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setReels(next);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // A row with no video is how you delete one, not an error to argue with.
      const cleaned = content.reels.filter((r) => r.video.trim());
      const res = await updateReelsAction({ ...content, reels: cleaned });
      if (res.success) {
        setReels(cleaned);
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to save the reels");
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
  const iconBtn =
    "w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30";
  const previewReels = content.reels.filter((r) => r.video.trim());

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reels</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            A row of short looping clips, each with a “Shop now” button on hover.
            Hidden until a reel is added.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Reels</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Reels saved — the homepage is updated.</span>
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
        {/* Hover and drag still work; a click must not leave the editor and
            lose unsaved changes. */}
        <div className="pt-6" onClickCapture={(e) => e.preventDefault()}>
          {previewReels.length > 0 ? (
            <Reels content={{ ...content, reels: previewReels }} />
          ) : (
            <p className="pb-6 text-center text-xs text-gray-400">
              Add a reel below to preview it.
            </p>
          )}
        </div>
      </div>

      <div className={card}>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Type className="w-4 h-4 text-accent" />
          <span>Heading</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Heading</label>
          <input
            type="text"
            value={content.heading}
            maxLength={80}
            onChange={(e) => setField("heading", e.target.value)}
            placeholder="Watch & Shop"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subheading</label>
          <input
            type="text"
            value={content.subheading}
            maxLength={200}
            onChange={(e) => setField("subheading", e.target.value)}
            placeholder="Fresh clips, new drops, and more."
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Social handle
            </label>
            <input
              type="text"
              value={content.handle}
              maxLength={40}
              onChange={(e) => setField("handle", e.target.value)}
              placeholder="@yourshop"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Follow button links to
            </label>
            <input
              type="text"
              value={content.followUrl}
              onChange={(e) => setField("followUrl", e.target.value)}
              placeholder="https://instagram.com/yourshop"
              className={`${inputClass} font-mono text-xs`}
            />
            <p className="text-[11px] text-gray-400 mt-1">Leave empty to hide the button.</p>
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
          Reels ({content.reels.length}/{MAX_REELS})
        </h3>

        {content.reels.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No reels yet. Add one below.</p>
        ) : (
          <ul className="space-y-4">
            {content.reels.map((reel, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-4 rounded-lg border border-gray-200 bg-gray-50/50"
              >
                <span className="w-5 pt-1 text-center text-xs font-bold text-gray-400 shrink-0">
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-3">
                  <ImageField
                    video
                    label="Reel video"
                    value={reel.video}
                    onChange={(v) => updateReel(index, { video: v })}
                    previewFit="cover"
                    previewClassName="h-40"
                    hint="Portrait 4:5 or 9:16 works best. Plays muted on a loop; keep it short and under ~5 MB."
                  />
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Product link
                    </label>
                    <input
                      type="text"
                      value={reel.href}
                      onChange={(e) => updateReel(index, { href: e.target.value })}
                      placeholder="/products/your-product or https://…"
                      className={`${inputClass} font-mono text-xs bg-white`}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Where “Shop now” goes. Leave empty for no button.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveReel(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move reel ${index + 1} up`}
                    className={iconBtn}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveReel(index, index + 1)}
                    disabled={index === content.reels.length - 1}
                    aria-label={`Move reel ${index + 1} down`}
                    className={iconBtn}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setReels(content.reels.filter((_, i) => i !== index))}
                    aria-label={`Delete reel ${index + 1}`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setReels([...content.reels, { video: "", href: "" }])}
          disabled={content.reels.length >= MAX_REELS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c0282b] hover:text-[#8f1e20] disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add reel</span>
        </button>
      </div>
    </form>
  );
}
