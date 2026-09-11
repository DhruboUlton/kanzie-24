import Skeleton from "./Skeleton";

/**
 * Stand-in for one ProductCard.
 *
 * The wrapper, the padding and the aspect-square image box are copied from
 * ProductCard verbatim, and each bar is the height of the *line box* of the
 * text it replaces rather than the font size — that is what makes the swap
 * shift-free. The hover classes are left off: nothing here is hoverable.
 *
 * Keep in step with src/components/ProductCard.tsx; the two are only
 * shift-free for as long as they agree.
 */
export default function ProductCardSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg p-2.5 bg-white shadow-sm">
      {/* One element, not a wrapper plus a fill: `.skeleton` already carries
          the `relative` and `overflow-hidden` the real image box needs. */}
      <Skeleton className="aspect-square" />
      <div className={compact ? "mt-2.5" : "mt-4"}>
        {/* brand — text-xs, line box 1rem */}
        <Skeleton className="h-4 w-16" />
        {/* name — text-lg (1.75rem), or text-base leading-tight (1.25rem) */}
        <Skeleton
          className={`mt-0.5 w-3/4 ${compact ? "h-5" : "h-7"}`}
        />
        {/* price row — one bar only: the struck-through original appears on
            sale items alone, and guessing wrong is its own shift. */}
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <Skeleton className={compact ? "h-5 w-14" : "h-6 w-16"} />
        </div>
      </div>
    </div>
  );
}
