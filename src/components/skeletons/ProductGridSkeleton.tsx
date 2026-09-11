import ProductCardSkeleton from "./ProductCardSkeleton";

/**
 * A grid of ProductCardSkeletons in the same columns and gaps every product
 * grid on the storefront uses.
 *
 * role="status" sits here rather than on each block, so the region is
 * announced once — "Loading products" — instead of once per card.
 */
export default function ProductGridSkeleton({
  count = 8,
  compact = true,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10"
    >
      <span className="sr-only">Loading products…</span>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}
