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
  RotateCcw,
} from "lucide-react";
import BrandLogoStrip from "@/components/BrandLogoStrip";
import { updateBrandStripAction } from "@/lib/actions/brand-strip";
import {
  BRAND_MARK_STYLES,
  BrandMark,
  BrandMarkStyle,
  BrandStripContent,
  DEFAULT_BRAND_MARKS,
  MAX_BRAND_MARKS,
  MAX_BRAND_NAME_LENGTH,
} from "@/lib/brand-strip";

export default function BrandStripForm({ initial }: { initial: BrandStripContent }) {
  const router = useRouter();
  const [content, setContent] = useState<BrandStripContent>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setMarks = (marks: BrandMark[]) => setContent((c) => ({ ...c, marks }));

  const updateMark = (index: number, patch: Partial<BrandMark>) =>
    setMarks(content.marks.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const addMark = () =>
    setMarks([...content.marks, { name: "", style: "display" }]);

  const removeMark = (index: number) =>
    setMarks(content.marks.filter((_, i) => i !== index));

  const moveMark = (from: number, to: number) => {
    if (to < 0 || to >= content.marks.length) return;
    const next = content.marks.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMarks(next);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // Blank rows are how you delete one — an empty name is a removal,
      // not an error to argue with.
      const cleaned = content.marks.filter((m) => m.name.trim().length > 0);
      const res = await updateBrandStripAction({ ...content, marks: cleaned });
      if (res.success) {
        setMarks(cleaned);
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to save the brand strip");
      }
    } catch {
      setError("Failed to save the brand strip");
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
          <h2 className="text-xl font-bold text-gray-900">Brand Strip</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            The row of names under New Arrivals on the homepage
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
          <span>Save Brand Strip</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Brand strip saved — the homepage is updated.</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* The names ship as placeholders, and they read as press coverage.
          Saying so here is cheaper than a customer finding out. */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          The names this shipped with are invented, and sitting under your
          products they read as real press or stockists. Replace them with
          brands you actually carry, or switch the row off below.
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Live Preview
          </h3>
        </div>
        {content.enabled && content.marks.some((m) => m.name.trim()) ? (
          <div className="pointer-events-none">
            <BrandLogoStrip
              content={{
                enabled: true,
                marks: content.marks.filter((m) => m.name.trim()),
              }}
            />
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-gray-400">
            Nothing shows on the homepage.
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span>
            <span className="block text-sm font-semibold text-gray-900">
              Show the strip
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Off hides the whole row without losing the names.
            </span>
          </span>
          <span className="relative inline-flex items-center shrink-0">
            <input
              type="checkbox"
              checked={content.enabled}
              onChange={(e) =>
                setContent((c) => ({ ...c, enabled: e.target.checked }))
              }
              className="peer sr-only"
            />
            <span className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-[#c0282b] transition-colors" />
            <span className="absolute left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Names ({content.marks.length}/{MAX_BRAND_MARKS})
          </h3>
          <button
            type="button"
            onClick={() =>
              setContent((c) => ({ ...c, marks: [...DEFAULT_BRAND_MARKS] }))
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to defaults</span>
          </button>
        </div>

        {content.marks.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No names yet. Add one below.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {content.marks.map((mark, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-5 pt-2.5 text-center text-xs font-bold text-gray-400 shrink-0">
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_11rem] gap-2">
                  <input
                    type="text"
                    value={mark.name}
                    maxLength={MAX_BRAND_NAME_LENGTH}
                    onChange={(e) => updateMark(index, { name: e.target.value })}
                    placeholder="Brand or retailer name"
                    className={inputClass}
                  />
                  <select
                    value={mark.style}
                    onChange={(e) =>
                      updateMark(index, { style: e.target.value as BrandMarkStyle })
                    }
                    aria-label={`Typeface for ${mark.name || `name ${index + 1}`}`}
                    className={`${inputClass} bg-white`}
                  >
                    {Object.entries(BRAND_MARK_STYLES).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => moveMark(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${mark.name || "this name"} left`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMark(index, index + 1)}
                    disabled={index === content.marks.length - 1}
                    aria-label={`Move ${mark.name || "this name"} right`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMark(index)}
                    aria-label={`Delete ${mark.name || `name ${index + 1}`}`}
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
          onClick={addMark}
          disabled={content.marks.length >= MAX_BRAND_MARKS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c0282b] hover:text-[#8f1e20] disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add name</span>
        </button>
      </div>
    </form>
  );
}
