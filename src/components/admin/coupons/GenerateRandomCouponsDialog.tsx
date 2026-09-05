"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle, Sparkles, Percent, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { generateRandomCouponsAction } from "@/lib/actions/coupons";
import { CouponDiscountType } from "@/lib/coupons-shared";
import { formatPrice } from "@/lib/format";

export default function GenerateRandomCouponsDialog({
  isOpen,
  onClose,
  isOwner,
}: {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [quantity, setQuantity] = useState<string>("100");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<string>("20");
  const [hasMinOrder, setHasMinOrder] = useState(true);
  const [minOrderBdt, setMinOrderBdt] = useState<string>("2000");
  const [isLimited, setIsLimited] = useState(true);
  const [usageLimit, setUsageLimit] = useState<string>("5");
  const [note, setNote] = useState("Influencer campaign - September");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    count: number;
    codesSample: string[];
  } | null>(null);

  if (!isOpen) return null;

  const numQuantity = parseInt(quantity, 10) || 0;
  const numDiscountValue = parseFloat(discountValue) || 0;
  const numMinOrderBdt = hasMinOrder ? parseFloat(minOrderBdt) || 0 : 0;
  const numLimit = isLimited ? parseInt(usageLimit, 10) || 0 : null;

  const totalPotentialRedemptions =
    numLimit !== null ? numQuantity * numLimit : "Unlimited";

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) {
      setError("Only the store Owner can generate coupons.");
      return;
    }

    if (numQuantity < 1 || numQuantity > 500) {
      setError("Quantity must be between 1 and 500.");
      return;
    }

    if (numDiscountValue <= 0) {
      setError("Discount value must be positive.");
      return;
    }

    if (discountType === "PERCENTAGE" && numDiscountValue > 100) {
      setError("Percentage discount cannot exceed 100%.");
      return;
    }

    if (isLimited && (!numLimit || numLimit < 1)) {
      setError("Usage limit must be at least 1 use per coupon.");
      return;
    }

    setError(null);
    setStep("confirm");
  }

  async function handleConfirmGenerate() {
    setLoading(true);
    setError(null);

    const finalDiscountValue =
      discountType === "PERCENTAGE"
        ? Math.round(numDiscountValue)
        : Math.round(numDiscountValue * 100);

    const minOrderCents =
      hasMinOrder && numMinOrderBdt > 0 ? Math.round(numMinOrderBdt * 100) : null;

    try {
      const res = await generateRandomCouponsAction({
        quantity: numQuantity,
        discountType,
        discountValue: finalDiscountValue,
        minimumOrderAmountCents: minOrderCents,
        usageLimit: numLimit,
        note: note.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to generate random coupons.");
        setStep("form");
      } else {
        setGeneratedResult(res.data || null);
        setStep("success");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred during batch generation.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  function handleCloseAll() {
    setStep("form");
    setGeneratedResult(null);
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleCloseAll} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Generate Random Coupons</h2>
              <p className="text-xs text-gray-500">Create a batch of independent unique coupons</p>
            </div>
          </div>
          <button
            onClick={handleCloseAll}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isOwner && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Only store accounts with the <strong>OWNER</strong> role can generate random coupons.</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleReview} className="mt-5 space-y-4 text-sm">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Number of Coupons (Batch Size) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 focus:outline-none focus:border-[#c0282b]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Generates between 1 and 500 unique random codes (e.g. 100).
              </p>
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

            {/* Minimum Order */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Minimum Order Requirement
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="randHasMinOrder"
                    checked={hasMinOrder}
                    onChange={(e) => setHasMinOrder(e.target.checked)}
                    className="w-4 h-4 text-[#c0282b] rounded border-gray-300 focus:ring-[#c0282b]"
                  />
                  <label htmlFor="randHasMinOrder" className="text-xs text-gray-600 font-medium">
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
                </div>
              )}
            </div>

            {/* Usage Limit Per Coupon */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Usage Limit (Per generated coupon)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setIsLimited(false)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                    !isLimited
                      ? "border-purple-600 bg-purple-50/40 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="font-bold">Unlimited</div>
                  <div className="text-[10px] text-gray-500 font-normal">Infinite uses each</div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLimited(true)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                    isLimited
                      ? "border-purple-600 bg-purple-50/40 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="font-bold">Limited (Recommended)</div>
                  <div className="text-[10px] text-gray-500 font-normal">Fixed uses per coupon</div>
                </button>
              </div>

              {isLimited && (
                <div className="mt-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 5"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-purple-600"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Each coupon receives its own individual limit of {usageLimit || 1} uses.
                  </p>
                </div>
              )}
            </div>

            {/* Internal Note */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Internal Campaign Note
              </label>
              <input
                type="text"
                placeholder="e.g. Influencer campaign - September"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#c0282b] text-xs"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full sm:w-auto text-center px-4 py-2.5 sm:py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isOwner}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-5 py-2.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <span>Review Batch Summary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {step === "confirm" && (
          <div className="mt-5 space-y-4">
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 space-y-3">
              <h3 className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>You are about to generate {numQuantity} coupons.</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-200/60">
                <div>
                  <span className="text-purple-600 block text-[11px]">Discount</span>
                  <span className="font-bold text-sm text-purple-950">
                    {discountType === "PERCENTAGE"
                      ? `${numDiscountValue}%`
                      : formatPrice(Math.round(numDiscountValue * 100))}
                  </span>
                </div>
                <div>
                  <span className="text-purple-600 block text-[11px]">Type</span>
                  <span className="font-bold text-sm text-purple-950">
                    {discountType === "PERCENTAGE" ? "Percentage Off" : "Fixed Discount"}
                  </span>
                </div>
                <div>
                  <span className="text-purple-600 block text-[11px]">Per-Coupon Limit</span>
                  <span className="font-bold text-sm text-purple-950">
                    {numLimit !== null ? `${numLimit} uses each` : "Unlimited"}
                  </span>
                </div>
                <div>
                  <span className="text-purple-600 block text-[11px]">Min Order</span>
                  <span className="font-bold text-sm text-purple-950">
                    {hasMinOrder && numMinOrderBdt > 0
                      ? formatPrice(Math.round(numMinOrderBdt * 100))
                      : "None"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-purple-200/60">
                <span className="text-purple-600 block text-[11px]">Internal Note</span>
                <span className="font-semibold text-purple-950">{note || "None"}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1.5">
              <p className="font-semibold text-gray-900">
                Total potential redemptions:{" "}
                <span className="text-[#c0282b]">
                  {numLimit !== null
                    ? `${numQuantity} × ${numLimit} = ${totalPotentialRedemptions}`
                    : "Unlimited"}
                </span>
              </p>
              <p>
                Each coupon is an independent record with its own counter
                {numLimit !== null
                  ? `, so no single code can be redeemed more than ${numLimit} time${numLimit === 1 ? "" : "s"}.`
                  : ", and none of them caps how often it can be redeemed."}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={loading}
                className="w-full sm:w-auto text-center px-4 py-2.5 sm:py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerate}
                disabled={loading || !isOwner}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-5 py-2.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm &amp; Generate {numQuantity} Coupons</span>
              </button>
            </div>
          </div>
        )}

        {step === "success" && generatedResult && (
          <div className="mt-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Successfully Generated {generatedResult.count} Coupons!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                All codes have been saved with individual limits and are ready for distribution.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-left">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Sample Generated Codes:
              </span>
              <div className="flex flex-wrap gap-2">
                {generatedResult.codesSample.map((c) => (
                  <span
                    key={c}
                    className="font-mono text-xs font-bold bg-white border border-gray-200 px-2 py-1 rounded text-purple-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
