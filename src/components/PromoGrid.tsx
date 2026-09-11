import SkeletonImage from "@/components/SkeletonImage";
import Link from "next/link";

// Demo promo tiles reusing the hero cutout renders. Swap `href`, `image`,
// and copy once real campaigns/products exist.
const TILES = [
  {
    eyebrow: "NEW ARRIVAL",
    title: "JCB 220X EXCAVATOR",
    href: "/products?category=excavators",
    image: "/hero/jcb-220x-excavator.png",
    bg: "bg-paper",
    text: "text-ink",
  },
  {
    eyebrow: "2-IN-1",
    title: "BACKHOE LOADERS",
    href: "/products",
    image: "/hero/jcb-backhoe-loader-1.png",
    bg: "bg-black",
    text: "text-white",
  },
  {
    eyebrow: "LIMITED TIME",
    title: "UP TO 30% OFF",
    href: "/products",
    image: "/hero/top-power-excavator.png",
    bg: "bg-accent",
    text: "text-white",
  },
];

export default function PromoGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid sm:grid-cols-3 gap-4">
        {TILES.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            className={`group relative aspect-[4/5] sm:aspect-square rounded-lg overflow-hidden ${tile.bg} ${tile.text}`}
          >
            <div className="absolute inset-0 flex items-center justify-center p-8 transition-transform duration-500 group-hover:scale-105">
              <div className="relative w-full h-full">
                <SkeletonImage
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  dark={tile.bg === "bg-black" || tile.bg === "bg-accent"}
                  className="object-contain"
                />
              </div>
            </div>
            <div className="absolute top-5 left-5">
              <p className="text-xs font-semibold tracking-wide opacity-70">
                {tile.eyebrow}
              </p>
              <p className="font-display text-2xl tracking-wide mt-0.5">
                {tile.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
