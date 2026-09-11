import Skeleton from "@/components/skeletons/Skeleton";
import ProductGridSkeleton from "@/components/skeletons/ProductGridSkeleton";

// Shown while the catalogue query runs. /products is a dynamic route, so this
// is what fills the gap on a navigation into the shop.
//
// The heading is real text, not a placeholder: it is the same on every render
// and costs nothing, so shimmering it would only replace something certain
// with something vague. Only the parts that depend on the database are
// stood in for.
//
// Widths below stand in for "All" plus the category pills.
const PILL_WIDTHS = ["w-16", "w-24", "w-20", "w-44", "w-24", "w-20"];

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-center mb-8">
        SHOP ALL MACHINES
      </h1>

      <div className="flex justify-center mb-10">
        <div className="flex flex-wrap justify-center gap-2">
          {PILL_WIDTHS.map((w) => (
            <Skeleton key={w} className={`h-9 rounded-full ${w}`} />
          ))}
        </div>
      </div>

      <ProductGridSkeleton count={8} compact />
    </div>
  );
}
