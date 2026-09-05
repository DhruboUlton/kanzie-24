"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle, Pencil } from "lucide-react";
import { updateCouponAction } from "@/lib/actions/coupons";
import { CouponView } from "@/lib/coupons-shared";

export default function EditCouponDialog({
  isOpen,
  onClose,
  coupon,
}: {
  isOpen: boolean;
  onClose: () => void;
  coupon: CouponView;
}) {
  const router = useRouter();
  const [isLimited, setIsLimited] = useState(coupon.usageLimit !== null);
  const [usageLimit, setUsageLimit] = useState<string>(
    coupon.usageLimit !== null ? String(coupon.usageLimit) : "100",
  );
  const [note, setNote] = useState(coupon.note || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const limitVal = isLimited && usageLimit ? parseInt(usageLimit, 10) : null;
    if (isLimited && (!limitVal || limitVal < 1)) {
      setError("Usage limit must be at least 1.");
      setLoading(false);
      return;
    }

    try {
      const res = await updateCouponAction(coupon.id, {
        note: note.trim() || null,
        usageLimit: limitVal,
      });

      if (!res.success) {
        setError(res.error || "Failed to update coupon.");
      } else {
        router.refresh();
        onClose();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Edit Coupon</h2>
              <p className="font-mono text-xs font-semibold text-[#c0282b]">{coupon.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-sm">
          {/* Usage info */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Historical Redemptions:</span>
              <span className="font-bold text-gray-900">{coupon.usageCount} used</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Current Limit:</span>
              <span className="font-bold text-gray-900">
                {coupon.usageLimit !== null ? `${coupon.usageLimit} max` : "Unlimited"}
              </span>
            </div>
          </div>

          {/* Usage Limit Setting */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Usage Limit
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsLimited(false)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                  !isLimited
                    ? "border-[#c0282b] bg-red-50/40 text-[#c0282b]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <div className="font-bold">Unlimited</div>
                <div className="text-[10px] text-gray-500 font-normal">No cap</div>
              </button>
              <button
                type="button"
                onClick={() => setIsLimited(true)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                  isLimited
                    ? "border-[#c0282b] bg-red-50/40 text-[#c0282b]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <div className="font-bold">Limited</div>
                <div className="text-[10px] text-gray-500 font-normal">Cap redemptions</div>
              </button>
            </div>

            {isLimited && (
              <div>
                <input
                  type="number"
                  min={coupon.usageCount}
                  step="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#c0282b]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Increasing this limit allows more redemptions without resetting past usage count ({coupon.usageCount}).
                </p>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Internal Admin Note
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Campaign or promotion details..."
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#c0282b] text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
