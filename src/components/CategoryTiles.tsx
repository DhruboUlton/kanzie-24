import Image from "next/image";
import Link from "next/link";
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
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 -mx-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:mx-0">
        {categories.map((cat) => {
          const cover = products.find((p) => p.category === cat.slug);
          return (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group relative shrink-0 w-[70%] aspect-[4/5] snap-start rounded-lg overflow-hidden bg-paper sm:w-auto"
            >
              {cover && (
                <Image
                  src={cover.images[0]}
                  alt={cat.name}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
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
