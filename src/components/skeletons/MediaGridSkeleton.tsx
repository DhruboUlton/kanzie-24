import Skeleton from "./Skeleton";

/**
 * Stand-in for the admin media library's tile grid.
 *
 * Columns, gap and tile shape match the real grid in MediaLibraryGrid, so the
 * thumbnails land where the placeholders were instead of the whole area
 * collapsing to a spinner and springing back.
 */
export default function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3"
    >
      <span className="sr-only">Loading media library…</span>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  );
}
