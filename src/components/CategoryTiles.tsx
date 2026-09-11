import Link from "next/link";
import SkeletonImage from "@/components/SkeletonImage";
import { Category, Product } from "@/lib/products";

export default function CategoryTiles({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-center mb-10">
        SHOP BY MACHINE
      </h2>
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 -mx-4 sm:px-6 sm:-mx-6 lg:px-8 lg:-mx-8">
        {categories.map((cat) => {
          // The category's own cover if one has been set. Otherwise the
          // first product filed under it, which is a guess and often the
          // wrong one — set a cover in /adpnl/categories to replace it.
          const cover =
            cat.imageUrl?.trim() ||
            products.find((p) => p.category === cat.slug)?.images[0] ||
            null;
          return (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group relative shrink-0 w-[70%] sm:w-64 lg:w-72 aspect-[4/5] snap-start rounded-lg overflow-hidden bg-paper"
            >
              {cover && (
                <SkeletonImage
                  src={cover}
                  // The tile prints the category name right below, so a
                  // matching alt makes a screen reader say it twice. The
                  // photo is decoration on top of that label.
                  alt=""
                  fill
                  sizes="(min-width: 640px) 288px, 70vw"
                  className="object-cover transition-all duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
              <span className="absolute bottom-5 left-5 font-display text-2xl text-white tracking-wide">
                {cat.name.toUpperCase()}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
