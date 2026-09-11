import Link from "next/link";
import SkeletonImage from "@/components/SkeletonImage";
import { PRODUCT_IMAGE_PLACEHOLDER, Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { resolveAvailability, resolvePricing } from "@/lib/product-pricing";

export default function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  // The same two calls the detail page and the order writer make, so a badge
  // here can never advertise a price the checkout will not honour.
  const pricing = resolvePricing(product);
  const availability = resolveAvailability(product);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="rounded-lg p-2.5 bg-white shadow-sm transition-all duration-300 ease-out group-hover:shadow-xl group-hover:scale-[1.03] group-hover:-translate-y-1 origin-center">
        <div className="relative aspect-square bg-paper rounded overflow-hidden">
          {pricing.onSale && (
            <span className="absolute top-3 left-3 z-10 bg-accent text-white text-xs font-bold px-2 py-1 rounded">
              {pricing.percentOff}% OFF
            </span>
          )}

          {!availability.purchasable && (
            <>
              {/* Dimmed rather than hidden: an unavailable product is still
                  worth browsing, it just cannot be bought. */}
              <span className="absolute inset-0 z-10 bg-white/60" />
              <span className="absolute top-3 right-3 z-20 bg-ink text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                {availability.label}
              </span>
            </>
          )}

          <SkeletonImage
            src={product.images[0] || PRODUCT_IMAGE_PLACEHOLDER}
            alt={product.name}
            fill
            sizes={
              compact
                ? "(min-width: 640px) 25vw, 50vw"
                : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover transition-all duration-500 group-hover:scale-105"
          />
        </div>
        <div className={compact ? "mt-2.5" : "mt-4"}>
          <p className="text-xs uppercase tracking-wide text-black/60">
            {product.brand}
          </p>
          <h3
            className={`font-display tracking-wide mt-0.5 group-hover:text-accent transition-colors ${
              compact ? "text-base leading-tight" : "text-lg"
            }`}
          >
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {pricing.originalCents !== null && (
              <span
                className={`text-black/60 line-through ${compact ? "text-xs" : "text-sm"}`}
              >
                {formatPrice(pricing.originalCents)}
              </span>
            )}
            <span
              className={`text-accent font-semibold ${compact ? "text-sm" : ""}`}
            >
              {formatPrice(pricing.effectiveCents)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
