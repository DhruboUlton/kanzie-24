"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SkeletonImage from "@/components/SkeletonImage";
import SkeletonVideo from "@/components/SkeletonVideo";
import {
  Plus,
  Trash2,
  Upload,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  Tag,
  Boxes,
  ArrowUpDown,
  GripVertical,
  Star,
  UploadCloud,
  Film,
} from "lucide-react";
import { parseVideoUrl } from "@/lib/video";
import { createProductAction, updateProductAction } from "@/lib/actions/product";
import RichTextEditor from "./RichTextEditor";
import MediaPickerModal from "./media/MediaPickerModal";
import { MediaItem } from "./media/types";
import { formatPrice } from "@/lib/format";
import {
  MAX_SALE_PERCENT,
  MIN_SALE_PERCENT,
  resolveAvailability,
  resolvePricing,
} from "@/lib/product-pricing";

export type CategoryOption = {
  id?: string;
  slug: string;
  name: string;
};

type ProductFormProps = {
  initialData?: any;
  categories: CategoryOption[];
  isEdit?: boolean;
};

export default function ProductForm({
  initialData,
  categories,
  isEdit,
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [autoSlug, setAutoSlug] = useState(!isEdit);
  const [brand, setBrand] = useState(initialData?.brand || "YIGONG");
  const [sku, setSku] = useState(initialData?.sku || "");
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId || categories[0]?.id || ""
  );

  const [priceTaka, setPriceTaka] = useState<number>(
    initialData?.priceCents ? initialData.priceCents / 100 : 9999
  );
  const [compareAtPriceTaka, setCompareAtPriceTaka] = useState<number | string>(
    initialData?.compareAtPriceCents ? initialData.compareAtPriceCents / 100 : ""
  );
  const [scale, setScale] = useState(initialData?.scale || "1:16");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription || ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  // Repeatable Features
  const [features, setFeatures] = useState<string[]>(
    Array.isArray(initialData?.features) && initialData.features.length > 0
      ? initialData.features
      : ["2.4GHz remote control", "Rechargeable battery pack included"]
  );

  // Repeatable Specs
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(
    Array.isArray(initialData?.specs) && initialData.specs.length > 0
      ? initialData.specs
      : [
          { label: "Scale", value: "1:16" },
          { label: "Control", value: "2.4GHz remote, 4-channel" },
          { label: "Material", value: "ABS body, die-cast accents" },
          { label: "Recommended age", value: "6+" },
        ]
  );

  // Images
  const [images, setImages] = useState<string[]>(
    Array.isArray(initialData?.images) && initialData.images.length > 0
      ? initialData.images
      : ["/products-dev/excavators/01.jpg"]
  );
  const [newImageUrl, setNewImageUrl] = useState("");

  // Video — plays as a gallery slide next to the photos.
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || "");

  // Popup video — separate clip for the auto-opening floating widget.
  const [popupVideoUrl, setPopupVideoUrl] = useState(
    initialData?.popupVideoUrl || ""
  );

  // Pricing. The "on sale" switch is the presence of salePercent rather than
  // a boolean of its own, so the toggle and the number cannot disagree.
  const [onSale, setOnSale] = useState<boolean>(
    typeof initialData?.salePercent === "number"
  );
  const [salePercent, setSalePercent] = useState<string>(
    initialData?.salePercent != null ? String(initialData.salePercent) : "20"
  );

  // Flags & Stock
  const [featured, setFeatured] = useState<boolean>(
    initialData?.featured ?? false
  );
  const [featuredOrder, setFeaturedOrder] = useState<string>(
    String(initialData?.featuredOrder ?? 0)
  );
  const [isNew, setIsNew] = useState<boolean>(initialData?.isNew ?? false);
  const [categoryOrder, setCategoryOrder] = useState<string>(
    String(initialData?.categoryOrder ?? 0)
  );
  const [soldOut, setSoldOut] = useState<boolean>(initialData?.soldOut ?? false);
  const [stockQty, setStockQty] = useState<number>(
    initialData?.stockQty ?? 10
  );

  // Everything the admin is about to save, priced by the same function the
  // storefront and the order writer use, so this preview is the real answer
  // rather than a second implementation that can drift.
  const parsedSalePercent = Number.parseInt(salePercent, 10);
  const previewPricing = resolvePricing({
    priceCents: Math.round((Number(priceTaka) || 0) * 100),
    salePercent:
      onSale && Number.isFinite(parsedSalePercent) ? parsedSalePercent : null,
    compareAtPriceCents: compareAtPriceTaka
      ? Math.round(Number(compareAtPriceTaka) * 100)
      : null,
  });
  const previewAvailability = resolveAvailability({
    soldOut,
    stockQty: Number(stockQty),
  });
  const salePercentError =
    onSale &&
    (!Number.isInteger(parsedSalePercent) ||
      parsedSalePercent < MIN_SALE_PERCENT ||
      parsedSalePercent > MAX_SALE_PERCENT)
      ? `Enter a whole number between ${MIN_SALE_PERCENT} and ${MAX_SALE_PERCENT}.`
      : null;

  // Auto-slug sync
  const handleNameChange = (val: string) => {
    setName(val);
    if (autoSlug) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setSlug(generated);
    }
  };

  // Centralized Media Picker State
  const [mediaPickerMode, setMediaPickerMode] = useState<"photos" | "video" | "popupVideo" | null>(null);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState<number | null>(null);

  const handleMediaSelect = (selected: MediaItem[]) => {
    if (mediaPickerMode === "photos") {
      const newUrls = selected.map((s) => s.url);
      setImages((prev) => Array.from(new Set([...prev, ...newUrls])));
    } else if (mediaPickerMode === "video") {
      if (selected[0]) {
        setVideoUrl(selected[0].url);
      }
    } else if (mediaPickerMode === "popupVideo") {
      if (selected[0]) {
        setPopupVideoUrl(selected[0].url);
      }
    }
    setMediaPickerMode(null);
  };

  const handleSetPrimary = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    const newImages = [...images];
    const [primary] = newImages.splice(index, 1);
    newImages.unshift(primary);
    setImages(newImages);
  };

  const handlePhotoDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverPhotoIndex !== index) {
      setDragOverPhotoIndex(index);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPhotoIndex === null || draggedPhotoIndex === targetIndex) {
      setDraggedPhotoIndex(null);
      setDragOverPhotoIndex(null);
      return;
    }
    const newImages = [...images];
    const [moved] = newImages.splice(draggedPhotoIndex, 1);
    newImages.splice(targetIndex, 0, moved);
    setImages(newImages);
    setDraggedPhotoIndex(null);
    setDragOverPhotoIndex(null);
  };

  const handlePhotoDragEnd = () => {
    setDraggedPhotoIndex(null);
    setDragOverPhotoIndex(null);
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Video validation
  const parsedVideo = videoUrl ? parseVideoUrl(videoUrl) : null;
  const parsedPopupVideo = popupVideoUrl ? parseVideoUrl(popupVideoUrl) : null;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      slug,
      brand,
      sku,
      categoryId,
      priceTaka: Number(priceTaka),
      salePercent: onSale ? parsedSalePercent : null,
      // A percentage sale supersedes a compare-at price; the action clears it
      // too, so the two can never both claim to be the original.
      compareAtPriceTaka:
        !onSale && compareAtPriceTaka ? Number(compareAtPriceTaka) : null,
      scale,
      shortDescription,
      description,
      features: features.filter((f) => f.trim().length > 0),
      specs: specs.filter((s) => s.label.trim() && s.value.trim()),
      images: images.filter((img) => img.trim().length > 0),
      featured,
      featuredOrder: Number.parseInt(featuredOrder, 10) || 0,
      isNew,
      categoryOrder: Number.parseInt(categoryOrder, 10) || 0,
      // Derived, never typed: recordStockChange keeps this equal to
      // (stockQty > 0), so saving anything else here would only be undone by
      // the next stock movement. The admin's intent lives in soldOut.
      inStock: Number(stockQty) > 0,
      soldOut,
      stockQty: Number(stockQty),
      videoUrl: videoUrl.trim() || null,
      popupVideoUrl: popupVideoUrl.trim() || null,
    };

    if (payload.images.length === 0) {
      setError("Please add at least one product photo.");
      setLoading(false);
      return;
    }

    if (salePercentError) {
      setError(salePercentError);
      setLoading(false);
      return;
    }

    try {
      let res;
      if (isEdit && initialData?.id) {
        res = await updateProductAction(initialData.id, payload);
      } else {
        res = await createProductAction(payload);
      }

      if (res.success) {
        router.push("/adpnl/products");
        router.refresh();
      } else {
        setError(res.error || "Failed to save product.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-7xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? `Edit: ${name}` : "Create New RC Vehicle"}
            </h2>
            <p className="text-xs text-gray-500">
              Changes sync instantly to the live storefront
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/adpnl/products")}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isEdit ? "Update Product" : "Publish Product"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col (2 span): Main info, descriptions, features, specs */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Info */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              General Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. YG258C RC Hydraulic Excavator"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b] focus:ring-1 focus:ring-[#c0282b]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    URL Slug *
                  </label>
                  <label className="text-[11px] text-gray-400 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSlug}
                      onChange={(e) => setAutoSlug(e.target.checked)}
                      className="rounded text-accent focus:ring-0"
                    />
                    <span>Auto-sync</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  placeholder="yg258c-rc-excavator"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-800 focus:outline-none focus:border-[#c0282b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  SKU Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="YG258C"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:border-[#c0282b]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Brand *
                </label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="YIGONG, TOPRACE, DIGMASTER"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Scale *
                </label>
                <input
                  type="text"
                  required
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  placeholder="1:16, 1:14, 1:20"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Short Description (Card summary) *
              </label>
              <textarea
                rows={2}
                required
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One or two sentences highlighting main vehicle capability..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Full Description *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Shown behind a &quot;More Details&quot; expander on the
                product page. Write it long and thorough — headings, bold
                terms, and lists here all help search engines understand the
                product.
              </p>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Detailed description of features, chassis, play experience..."
              />
            </div>
          </div>

          {/* Key Features Bullet List */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Key Features (Bullet points)
              </h3>
              <button
                type="button"
                onClick={() => setFeatures((prev) => [...prev, ""])}
                className="text-xs font-semibold text-[#c0282b] hover:text-[#8f1e20] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Feature</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-bold text-gray-400">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => {
                      const updated = [...features];
                      updated[idx] = e.target.value;
                      setFeatures(updated);
                    }}
                    placeholder="e.g. Full hydraulic boom & bucket control"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                  />
                  {features.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFeatures((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Technical Specifications Table
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSpecs((prev) => [...prev, { label: "", value: "" }])
                }
                className="text-xs font-semibold text-[#c0282b] hover:text-[#8f1e20] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Spec Row</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {specs.map((spec, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={spec.label}
                    onChange={(e) => {
                      const updated = [...specs];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setSpecs(updated);
                    }}
                    placeholder="Spec Label (e.g. Material)"
                    className="w-1/3 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => {
                      const updated = [...specs];
                      updated[idx] = { ...updated[idx], value: e.target.value };
                      setSpecs(updated);
                    }}
                    placeholder="Spec Value (e.g. ABS body, die-cast)"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                  />
                  {specs.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSpecs((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col (1 span): Pricing, Category, Media, Video, Stock */}
        <div className="space-y-6">
          {/* Pricing */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider">
              <Tag className="w-4 h-4 text-[#c0282b]" />
              Pricing
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Regular Price (৳ Taka) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold text-sm">
                  ৳
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={priceTaka}
                  onChange={(e) => setPriceTaka(parseFloat(e.target.value) || 0)}
                  placeholder="9999"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:border-[#c0282b]"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                What the product is worth before any discount.
              </p>
            </div>

            {/* On sale. The toggle is the presence of a percentage, not a
                separate flag, so the two can never contradict each other. */}
            <div className="rounded-lg border border-gray-200 p-3.5 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-gray-800">On Sale</span>
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={onSale}
                    onChange={(e) => setOnSale(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-[#c0282b] transition-colors" />
                  <span className="absolute left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </span>
              </label>

              {onSale && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Sale Percentage
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={MIN_SALE_PERCENT}
                      max={MAX_SALE_PERCENT}
                      step={1}
                      value={salePercent}
                      onChange={(e) => setSalePercent(e.target.value)}
                      className={`w-full pl-3.5 pr-8 py-2 border rounded-lg text-sm font-semibold focus:outline-none ${
                        salePercentError
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300 focus:border-[#c0282b]"
                      }`}
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 font-bold text-sm">
                      %
                    </span>
                  </div>
                  {salePercentError && (
                    <p className="text-[11px] text-red-600 mt-1">{salePercentError}</p>
                  )}
                </div>
              )}

              {/* The preview is produced by resolvePricing — the same function
                  the product card, the detail page and the order writer use. */}
              <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Customer sees
                </p>
                <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                  <span className="text-lg font-bold text-gray-900 font-display">
                    {formatPrice(previewPricing.effectiveCents)}
                  </span>
                  {previewPricing.originalCents !== null && (
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(previewPricing.originalCents)}
                    </span>
                  )}
                  {previewPricing.percentOff !== null && (
                    <span className="text-[10px] font-bold bg-[#c0282b] text-white px-1.5 py-0.5 rounded">
                      {previewPricing.percentOff}% OFF
                    </span>
                  )}
                </div>
                {!previewPricing.onSale && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    No sale badge will be shown.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Compare At / Original Price (৳ Taka)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold text-sm">
                  ৳
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  disabled={onSale}
                  value={onSale ? "" : compareAtPriceTaka}
                  onChange={(e) => setCompareAtPriceTaka(e.target.value)}
                  placeholder={onSale ? "Not used during a sale" : "Optional original price"}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b] disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {onSale
                  ? "A percentage sale already uses the regular price as the original, so this is cleared on save."
                  : "For a permanent markdown with no percentage. Must be above the regular price to show."}
              </p>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider">
              <Boxes className="w-4 h-4 text-[#c0282b]" />
              Inventory
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Stock Count
              </label>
              <input
                type="number"
                min={0}
                value={stockQty}
                onChange={(e) => setStockQty(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-700 mb-1.5">
                Availability
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSoldOut(false)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    !soldOut
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => setSoldOut(true)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    soldOut
                      ? "border-[#c0282b] bg-red-50 text-[#c0282b]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Sold Out
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Sold Out holds the product back even while stock remains. It is
                never changed by receiving or selling stock.
              </p>
            </div>

            {/* Resolved by resolveAvailability, the same call the storefront
                and the order validation make. */}
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Customers can
              </p>
              <p
                className={`text-sm font-bold mt-0.5 ${
                  previewAvailability.purchasable ? "text-emerald-600" : "text-[#c0282b]"
                }`}
              >
                {previewAvailability.purchasable
                  ? "Buy this product"
                  : `Browse only — ${previewAvailability.label}`}
              </p>
            </div>
          </div>

          {/* Merchandising */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider">
              <ArrowUpDown className="w-4 h-4 text-[#c0282b]" />
              Merchandising
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
              >
                {/* Products are filed on leaves: a category that has
                    subcategories becomes a grouping label, not a choice. */}
                {categories
                  .filter((c: any) => !c.parentId)
                  .map((parent: any) => {
                    const children = categories.filter(
                      (c: any) => c.parentId && c.parentId === parent.id,
                    );
                    if (children.length === 0) {
                      return (
                        <option
                          key={parent.id || parent.slug}
                          value={parent.id || parent.slug}
                        >
                          {parent.name}
                        </option>
                      );
                    }
                    return (
                      <optgroup key={parent.id || parent.slug} label={parent.name}>
                        {children.map((c: any) => (
                          <option key={c.id || c.slug} value={c.id || c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category Display Order
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={categoryOrder}
                onChange={(e) => setCategoryOrder(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Lower numbers come first in the category listing. Equal numbers
                fall back to newest first.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 text-accent rounded focus:ring-0"
                />
                <span className="text-xs font-semibold text-gray-800">
                  Featured on Homepage
                </span>
              </label>

              {featured && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Featured Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={featuredOrder}
                    onChange={(e) => setFeaturedOrder(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Independent of the category order — a product can lead the
                    featured rail and still sit far down its category.
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="w-4 h-4 text-accent rounded focus:ring-0"
                />
                <span className="text-xs font-semibold text-gray-800">
                  New Arrival Badge
                </span>
              </label>
            </div>
          </div>

          {/* Product Photos Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Product Photos ({images.length})
              </h3>
              <button
                type="button"
                onClick={() => setMediaPickerMode("photos")}
                className="px-3 py-1.5 bg-[#c0282b] hover:bg-[#a51f22] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Select / Add Photos</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Select or upload photos from the Media Library. Drag and drop thumbnails to reorder them. The first image is the Primary photo.
            </p>

            {/* Drag and Drop Thumbnail Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {images.map((img, i) => (
                  <div
                    key={`${img}-${i}`}
                    draggable
                    onDragStart={(e) => handlePhotoDragStart(e, i)}
                    onDragOver={(e) => handlePhotoDragOver(e, i)}
                    onDrop={(e) => handlePhotoDrop(e, i)}
                    onDragEnd={handlePhotoDragEnd}
                    className={`group relative aspect-square bg-gray-50 rounded-xl overflow-hidden border-2 transition-all cursor-move select-none ${
                      dragOverPhotoIndex === i
                        ? "border-[#c0282b] scale-[1.03] shadow-md ring-2 ring-[#c0282b]/20"
                        : draggedPhotoIndex === i
                        ? "opacity-40 border-dashed border-gray-400"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <SkeletonImage
                      src={img}
                      alt={`Photo ${i + 1}`}
                      fill
                      sizes="(max-width: 640px) 33vw, 200px"
                      className="object-contain p-1 pointer-events-none"
                    />

                    {/* Drag Handle Indicator */}
                    <div className="absolute top-1.5 left-1.5 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <GripVertical className="w-3 h-3" />
                    </div>

                    {/* Primary Badge */}
                    {i === 0 ? (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/85 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(i);
                        }}
                        title="Set as Primary photo"
                        className="absolute bottom-1.5 left-1.5 bg-white/90 hover:bg-white text-gray-800 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer border border-gray-200"
                      >
                        <Star className="w-2.5 h-2.5 text-gray-500" />
                        Set Primary
                      </button>
                    )}

                    {/* Remove from Product */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(i);
                      }}
                      title="Remove from product (keeps in Media Library)"
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => setMediaPickerMode("photos")}
                className="p-6 border-2 border-dashed border-gray-300 hover:border-[#c0282b] bg-gray-50/70 hover:bg-gray-50 rounded-xl cursor-pointer text-center transition-colors space-y-1.5"
              >
                <UploadCloud className="w-8 h-8 text-gray-400 mx-auto" />
                <div className="text-xs font-semibold text-gray-700">No photos added yet</div>
                <div className="text-[11px] text-gray-400">Click to open Media Library and select or upload photos</div>
              </div>
            )}

            {/* Add by URL input */}
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <span className="text-[11px] font-medium text-gray-500">
                Or add photo by external URL:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="/products-dev/... or https://..."
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors"
                >
                  Add URL
                </button>
              </div>
            </div>
          </div>

          {/* Product Video Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <Video className="w-4 h-4 text-accent" />
                <span>Product Video</span>
              </div>
              {videoUrl && (
                <button
                  type="button"
                  onClick={() => setVideoUrl("")}
                  className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Plays inline in the gallery as a slide next to photos. Select a video from your Media Library or paste an external YouTube / Google Drive link.
            </p>

            {/* Select from Media Library Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMediaPickerMode("video")}
                className="flex-1 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Film className="w-4 h-4 text-[#c0282b]" />
                <span>{videoUrl ? "Change Video from Media Library" : "Select Video from Media Library"}</span>
              </button>
            </div>

            {/* URL Input Alternative */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-500">
                Or enter external video URL / link:
              </span>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or YouTube or /api/uploads/..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
              />
            </div>

            {/* Video Status & Preview Player */}
            {videoUrl && (
              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                  {parsedVideo ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Valid video ({parsedVideo.type.toUpperCase()})
                        {parsedVideo.type === "direct" && " — Media Library Video File"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Unrecognized link (Drive / YouTube / direct video supported)</span>
                    </div>
                  )}
                </div>

                {parsedVideo && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-black aspect-video max-h-48 relative flex items-center justify-center">
                    {parsedVideo.type === "direct" ? (
                      <SkeletonVideo
                        src={parsedVideo.src}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                        containerClassName="w-full h-full flex items-center justify-center"
                      />
                    ) : parsedVideo.type === "youtube" ? (
                      <iframe
                        src={parsedVideo.embedUrl}
                        className="w-full h-full"
                        allow="encrypted-media"
                      />
                    ) : (
                      <iframe
                        src={parsedVideo.fallbackEmbedUrl}
                        className="w-full h-full"
                        allow="encrypted-media"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Popup Video Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <Video className="w-4 h-4 text-accent" />
                <span>Popup Video</span>
              </div>
              {popupVideoUrl && (
                <button
                  type="button"
                  onClick={() => setPopupVideoUrl("")}
                  className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Auto-opens in a floating corner widget a few seconds after a visitor lands on the product page. Separate clip from the gallery video above.
            </p>

            {/* Select from Media Library Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMediaPickerMode("popupVideo")}
                className="flex-1 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Film className="w-4 h-4 text-[#c0282b]" />
                <span>{popupVideoUrl ? "Change Video from Media Library" : "Select Video from Media Library"}</span>
              </button>
            </div>

            {/* URL Input Alternative */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-500">
                Or enter external video URL / link:
              </span>
              <input
                type="text"
                value={popupVideoUrl}
                onChange={(e) => setPopupVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or YouTube or /api/uploads/..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
              />
            </div>

            {/* Video Status & Preview Player */}
            {popupVideoUrl && (
              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                  {parsedPopupVideo ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Valid video ({parsedPopupVideo.type.toUpperCase()})
                        {parsedPopupVideo.type === "direct" && " — Media Library Video File"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Unrecognized link (Drive / YouTube / direct video supported)</span>
                    </div>
                  )}
                </div>

                {parsedPopupVideo && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-black aspect-video max-h-48 relative flex items-center justify-center">
                    {parsedPopupVideo.type === "direct" ? (
                      <SkeletonVideo
                        src={parsedPopupVideo.src}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                        containerClassName="w-full h-full flex items-center justify-center"
                      />
                    ) : parsedPopupVideo.type === "youtube" ? (
                      <iframe
                        src={parsedPopupVideo.embedUrl}
                        className="w-full h-full"
                        allow="encrypted-media"
                      />
                    ) : (
                      <iframe
                        src={parsedPopupVideo.fallbackEmbedUrl}
                        className="w-full h-full"
                        allow="encrypted-media"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WordPress Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerMode !== null}
        onClose={() => setMediaPickerMode(null)}
        onSelect={handleMediaSelect}
        allowedTypes={mediaPickerMode === "photos" ? ["IMAGE"] : ["VIDEO"]}
        multiple={mediaPickerMode === "photos"}
        title={
          mediaPickerMode === "photos"
            ? "Select Product Photos"
            : mediaPickerMode === "video"
            ? "Select Product Video"
            : "Select Popup Video"
        }
        confirmText={mediaPickerMode === "photos" ? "Insert Photos" : "Select Video"}
      />
    </form>
  );
}
