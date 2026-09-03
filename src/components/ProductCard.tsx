import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";

export default function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="rounded-lg p-2.5 bg-white shadow-sm transition-all duration-300 ease-out group-hover:shadow-xl group-hover:scale-[1.03] group-hover:-translate-y-1 origin-center">
        <div className="relative aspect-square bg-paper rounded overflow-hidden">
          {product.compareAtPriceCents && (
            <span className="absolute top-3 left-3 z-10 bg-accent text-white text-xs font-bold px-2 py-1 rounded">
              SALE
            </span>
          )}
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes={
              compact
                ? "(min-width: 640px) 25vw, 50vw"
                : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className={compact ? "mt-2.5" : "mt-4"}>
          <p className="text-xs uppercase tracking-wide text-black/40">
            {product.brand}
          </p>
          <h3
            className={`font-display tracking-wide mt-0.5 group-hover:text-accent transition-colors ${
              compact ? "text-base leading-tight" : "text-lg"
            }`}
          >
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {product.compareAtPriceCents && (
              <span
                className={`text-black/40 line-through ${compact ? "text-xs" : "text-sm"}`}
              >
                {formatPrice(product.compareAtPriceCents)}
              </span>
            )}
            <span
              className={`text-accent font-semibold ${compact ? "text-sm" : ""}`}
            >
              {formatPrice(product.priceCents)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
