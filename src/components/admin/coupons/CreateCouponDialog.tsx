"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle, Tag, Percent, Info } from "lucide-react";
import { createCustomCouponAction } from "@/lib/actions/coupons";
import { CouponDiscountType } from "@/lib/coupons-shared";

export default function CreateCouponDialog({
  isOpen,
  onClose,
  isOwner,
}: {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<string>("20");
  const [hasMinOrder, setHasMinOrder] = useState(false);
  const [minOrderBdt, setMinOrderBdt] = useState<string>("2000");
  const [isLimited, setIsLimited] = useState(false);
  const [usageLimit, setUsageLimit] = useState<string>("100");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) {
      setError("Only the store Owner can create coupons.");
      return;
    }

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError("Please enter a coupon code.");
      return;
    }

    if (trimmedCode.length < 6) {
      setError("Coupon code must be at least 6 characters so it can't be guessed.");
      return;
    }

    const numDiscountValue = parseFloat(discountValue);
    if (isNaN(numDiscountValue) || numDiscountValue <= 0) {
      setError("Please enter a valid positive discount value.");
      return;
    }

    if (discountType === "PERCENTAGE" && numDiscountValue > 100) {
      setError("Percentage discount cannot exceed 100%.");
      return;
    }

    // Convert fixed discount or min order to cents
    const finalDiscountValue =
      discountType === "PERCENTAGE"
        ? Math.round(numDiscountValue)
        : Math.round(numDiscountValue * 100);

    const minOrderCents =
      hasMinOrder && minOrderBdt ? Math.round(parseFloat(minOrderBdt) * 100) : null;

    const limitVal =
      isLimited && usageLimit ? parseInt(usageLimit, 10) : null;

    setLoading(true);
    setError(null);

    try {
      const res = await createCustomCouponAction({
        code: trimmedCode,
        discountType,
        discountValue: finalDiscountValue,
        minimumOrderAmountCents: minOrderCents,
        usageLimit: limitVal,
        note: note.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to create coupon.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#c0282b] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Create Custom Coupon</h2>
              <p className="text-xs text-gray-500">Configure a promotional coupon code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isOwner && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Only store accounts with the <strong>OWNER</strong> role can create coupons.</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-sm">
          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Coupon Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. SALE20, SAVE500, EID2026"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              required
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg uppercase font-mono font-bold text-gray-900 focus:outline-none focus:border-[#c0282b]"
            />
            <p className="text-[11px] text-gray-400 mt-1">Codes are normalized to uppercase and must be unique.</p>
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Discount Type
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDiscountType("PERCENTAGE")}
                  className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all ${
                    discountType === "PERCENTAGE"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Percent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("FIXED")}
                  className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all ${
                    discountType === "FIXED"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <span>৳ Fixed</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {discountType === "PERCENTAGE" ? "Percentage (%)" : "Fixed Amount (৳)"} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={discountType === "PERCENTAGE" ? "1" : "any"}
                  min="1"
                  max={discountType === "PERCENTAGE" ? "100" : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                  placeholder={discountType === "PERCENTAGE" ? "20" : "500"}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#c0282b]"
                />
              </div>
            </div>
          </div>

          {/* Minimum Order */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Minimum Order Requirement
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasMinOrder"
                  checked={hasMinOrder}
                  onChange={(e) => setHasMinOrder(e.target.checked)}
                  className="w-4 h-4 text-[#c0282b] rounded border-gray-300 focus:ring-[#c0282b]"
                />
                <label htmlFor="hasMinOrder" className="text-xs text-gray-600 font-medium">
                  Require minimum order
                </label>
              </div>
            </div>

            {hasMinOrder && (
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                  ৳
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="2000"
                  value={minOrderBdt}
                  onChange={(e) => setMinOrderBdt(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#c0282b]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Coupon cannot be redeemed unless cart subtotal meets or exceeds this amount.
                </p>
              </div>
            )}
          </div>

          {/* Usage Limit */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Usage Limit (Global redemptions)
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
                <div className="text-[10px] text-gray-500 font-normal">No redemption cap</div>
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
                <div className="text-[10px] text-gray-500 font-normal">Cap total redemptions</div>
              </button>
            </div>

            {isLimited && (
              <div className="mt-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 5, 50, 100"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#c0282b]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Coupon automatically stops accepting redemptions once this count is reached.
                </p>
              </div>
            )}
          </div>

          {/* Internal Admin Note */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Internal Admin Note
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Black Friday campaign, Influencer campaign - Rahim"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#c0282b] text-xs"
            />
            <p className="text-[11px] text-gray-400 mt-0.5">
              Visible to staff and admins only. Never shown to customers at checkout.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto text-center px-4 py-2.5 sm:py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isOwner}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-5 py-2.5 sm:py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Coupon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
