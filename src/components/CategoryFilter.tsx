import Link from "next/link";
import { Category } from "@/lib/products";

export default function CategoryFilter({
  categories,
  active,
}: {
  categories: Category[];
  active: string;
}) {
  const tabs = [{ slug: "all", name: "All" }, ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.slug === active;
        const href =
          tab.slug === "all" ? "/products" : `/products?category=${tab.slug}`;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              isActive
                ? "bg-ink text-white border-ink"
                : "border-black/15 text-black/60 hover:border-ink hover:text-ink"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
