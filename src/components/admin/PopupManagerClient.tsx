"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Type,
  X,
} from "lucide-react";
import ImageField from "@/components/admin/ImageField";
import { updatePopupConfigAction } from "@/lib/actions/popup";
import { PopupConfig } from "@/lib/popup";

export default function PopupManagerClient({
  initial,
  canManage,
}: {
  initial: PopupConfig;
  canManage: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState<PopupConfig>(initial);
  // What is actually stored, as opposed to what is being edited. The status
  // pill used to read the draft, so flipping the switch made the header say
  // "Disabled" while the storefront was still showing the popup — the toggle
  // looked like it had done the job and nothing had been written.
  const [saved, setSaved] = useState<PopupConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewCopied, setPreviewCopied] = useState(false);
  const [resetStorageNotice, setResetStorageNotice] = useState(false);

  // Cheap and exact: the config is a flat object of primitives.
  const isDirty = JSON.stringify(content) !== JSON.stringify(saved);

  const setField = <K extends keyof PopupConfig>(
    key: K,
    value: PopupConfig[K],
  ) => setContent((c) => ({ ...c, [key]: value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await updatePopupConfigAction(content);
      if (res.success) {
        setSaved(content);
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to save popup settings");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function handleResetStorage() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kanzie_popup_dismissed");
      localStorage.removeItem("kanzie_popup_dismissed_time");
      setResetStorageNotice(true);
      setTimeout(() => setResetStorageNotice(false), 3000);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Pop up</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                saved.enabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {saved.enabled ? "Active on Site" : "Disabled"}
            </span>
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                <AlertCircle className="w-3.5 h-3.5" />
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure promotional or announcement pop up shown to storefront visitors (no newsletter required)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetStorage}
            title="Reset dismissal memory in this browser to test on storefront"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Reset Test Cookie</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canManage}
            title={canManage ? undefined : "You do not have permission to change the pop up"}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Pop up</span>
          </button>
        </div>
      </div>

      {resetStorageNotice && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Test memory reset! When you open or refresh the storefront, the pop up will show again.
          </span>
        </div>
      )}

      {!canManage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            You can see these settings but not change them. Ask an owner for
            the &ldquo;Change popup content and display rules&rdquo; permission.
          </span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Pop up configuration saved — storefront updated immediately.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Settings on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Fields (7 cols).
            A fieldset rather than a disabled prop on each control: it turns
            off every descendant natively, including the ones inside
            ImageField, so a read-only viewer cannot edit anything by
            reaching past a control someone forgot to mark. */}
        <fieldset
          disabled={!canManage}
          className="lg:col-span-7 space-y-6 min-w-0 disabled:opacity-60"
        >
          {/* Activation Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#c0282b]" />
                  <span>Pop up Status</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Turn the pop up modal on or off across your store
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.enabled}
                  onChange={(e) => setField("enabled", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c0282b]"></div>
              </label>
            </div>
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Type className="w-4 h-4 text-[#c0282b]" />
              <span>Pop up Content</span>
            </h2>

            {/* Logo / Header Image */}
            <ImageField
              label="Header Image / Brand Logo (Optional)"
              value={content.imageUrl}
              onChange={(url) => setField("imageUrl", url)}
              hint="Select a logo or promo graphic from your Media Library (displayed at the top of the pop up)."
              previewClassName="h-20"
              previewFit="contain"
            />

            {content.imageUrl && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Image Alt Text
                </label>
                <input
                  type="text"
                  value={content.imageAlt}
                  onChange={(e) => setField("imageAlt", e.target.value)}
                  placeholder="e.g. Kanzie Promotion"
                  className={inputClass}
                />
              </div>
            )}

            {/* Badge / Eyebrow text */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Badge / Tag Text (Optional)
              </label>
              <input
                type="text"
                value={content.badgeText}
                onChange={(e) => setField("badgeText", e.target.value)}
                placeholder="e.g. SPECIAL OFFER or EXCLUSIVE DEAL"
                className={inputClass}
              />
            </div>

            {/* Headline / Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Headline / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={content.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. FUEL YOUR RC OBSESSION"
                className={`${inputClass} font-semibold`}
              />
            </div>

            {/* Description / Subtext */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description / Message Text
              </label>
              <textarea
                rows={3}
                value={content.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="e.g. Save 10% on your order today! Use our special discount code at checkout."
                className={inputClass}
              />
            </div>

            {/* Coupon Code (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Coupon / Promo Code (Optional)
              </label>
              <input
                type="text"
                value={content.couponCode}
                onChange={(e) => setField("couponCode", e.target.value.toUpperCase())}
                placeholder="e.g. BRRRRT10 or SAVE10"
                className={`${inputClass} font-mono uppercase tracking-wider`}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                If provided, visitors get an interactive coupon box with a 1-click &quot;Copy Code&quot; button.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Button Text
                </label>
                <input
                  type="text"
                  value={content.primaryButtonText}
                  onChange={(e) => setField("primaryButtonText", e.target.value)}
                  placeholder="e.g. SHOP NOW"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Button URL
                </label>
                <input
                  type="text"
                  value={content.primaryButtonUrl}
                  onChange={(e) => setField("primaryButtonUrl", e.target.value)}
                  placeholder="e.g. /products"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dismiss Link Text
                </label>
                <input
                  type="text"
                  value={content.secondaryButtonText}
                  onChange={(e) => setField("secondaryButtonText", e.target.value)}
                  placeholder="e.g. No, thanks"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Footer Disclaimer (Optional)
                </label>
                <input
                  type="text"
                  value={content.footerText}
                  onChange={(e) => setField("footerText", e.target.value)}
                  placeholder="e.g. Limited time offer on select models."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Trigger & Targeting Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Clock className="w-4 h-4 text-[#c0282b]" />
              <span>Timing &amp; Display Rules</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Delay */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Delay Before Appearance (Seconds)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={content.delaySeconds}
                    onChange={(e) =>
                      setField("delaySeconds", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className={inputClass}
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">sec</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  8s or more keeps your Google PageSpeed score intact. Anything
                  under about 7s appears while Google is still measuring how
                  fast the page settles, and measured roughly 3.3s of Speed
                  Index against 1.3s without it. Lower it if the trade is worth
                  it &mdash; just know you are making it.
                </p>
              </div>

              {/* Show Frequency */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Display Frequency
                </label>
                <select
                  value={content.showFrequency}
                  onChange={(e) =>
                    setField("showFrequency", e.target.value as PopupConfig["showFrequency"])
                  }
                  className={inputClass}
                >
                  <option value="once_per_session">Once per visit session</option>
                  <option value="once_per_day">Once per 24 hours</option>
                  <option value="every_load">Every page load (Testing)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Prevents annoying repeating popups for your shoppers.
                </p>
              </div>
            </div>

            {/* Target Pages */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Where should the pop up appear?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "all", label: "All Pages" },
                  { id: "home_only", label: "Homepage Only" },
                  { id: "products_only", label: "Product Pages Only" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setField("targetPages", item.id as PopupConfig["targetPages"])
                    }
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      content.targetPages === item.id
                        ? "border-[#c0282b] bg-[#c0282b]/5 text-[#c0282b] font-semibold"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Right Column: Interactive Live Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5 text-[#c0282b]" />
              <span>Live Visual Preview</span>
            </div>
            <span className="text-[11px] text-gray-400">Updates as you edit</span>
          </div>

          {/* Modal Mockup Container */}
          <div className="relative rounded-2xl bg-gray-900/60 backdrop-blur-xs p-4 sm:p-6 border border-gray-200 shadow-xl overflow-hidden min-h-[480px] flex items-center justify-center">
            {/* Background Storefront Hint */}
            <div className="absolute inset-0 opacity-15 pointer-events-none select-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

            {!content.enabled && (
              <div className="absolute top-3 left-3 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider z-20">
                Disabled Preview
              </div>
            )}

            {/* The Actual Pop Up Card */}
            <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 sm:p-7 text-center border border-gray-100 z-10 animate-in fade-in zoom-in-95 duration-200">
              {/* Close Button X */}
              <button
                type="button"
                className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Logo / Image */}
              {content.imageUrl ? (
                <div className="mb-4 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={content.imageUrl}
                    alt={content.imageAlt || "Offer"}
                    className="max-h-12 max-w-[180px] object-contain"
                  />
                </div>
              ) : (
                // Mirrors the storefront fallback exactly, so the preview
                // does not promise something different from the real popup.
                <div className="mb-4 flex justify-center">
                  <Image
                    src="/kanzie-icon.png"
                    alt="KANZIE"
                    width={256}
                    height={220}
                    className="h-10 w-auto"
                  />
                </div>
              )}

              {/* Optional Badge */}
              {content.badgeText && (
                <div className="mb-2">
                  <span className="inline-block bg-red-50 text-[#c0282b] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                    {content.badgeText}
                  </span>
                </div>
              )}

              {/* Headline */}
              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight uppercase mb-2 leading-snug">
                {content.title || "YOUR POP UP HEADLINE"}
              </h3>

              {/* Subtext */}
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                {content.description ||
                  "Write your promotional message or announcement text here."}
              </p>

              {/* Optional Coupon Code Box */}
              {content.couponCode && (
                <div className="mb-4 p-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-between gap-2">
                  <div className="text-left">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      Promo Code
                    </span>
                    <span className="font-mono font-bold text-sm text-gray-900 tracking-wider">
                      {content.couponCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewCopied(true);
                      setTimeout(() => setPreviewCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    {previewCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Primary CTA Button */}
              <button
                type="button"
                className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
              >
                {content.primaryButtonText || "SHOP NOW"}
              </button>

              {/* Dismiss / Secondary Link */}
              {content.secondaryButtonText && (
                <button
                  type="button"
                  className="mt-3 text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium block w-full text-center"
                >
                  {content.secondaryButtonText}
                </button>
              )}

              {/* Disclaimer */}
              {content.footerText && (
                <p className="mt-3 text-[10px] text-gray-400 leading-tight">
                  {content.footerText}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
