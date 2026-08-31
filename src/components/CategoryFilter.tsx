import Link from "next/link";
import { Category, CategoryNode } from "@/lib/products";

function Chip({
  slug,
  name,
  active,
  small = false,
}: {
  slug: string;
  name: string;
  active: string;
  small?: boolean;
}) {
  const isActive = slug === active;
  const href = slug === "all" ? "/products" : `/products?category=${slug}`;
  return (
    <Link
      href={href}
      className={`rounded-full border transition-colors ${
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm font-semibold"
      } ${
        isActive
          ? "bg-ink text-white border-ink"
          : "border-black/15 text-black/60 hover:border-ink hover:text-ink"
      }`}
    >
      {name}
    </Link>
  );
}

export default function CategoryFilter({
  tree,
  active,
}: {
  tree: CategoryNode[];
  active: string;
}) {
  // Subcategories are shown for whichever top-level group is in play —
  // either it's selected, or one of its children is.
  const openParent: CategoryNode | undefined = tree.find(
    (parent) =>
      parent.slug === active || parent.children.some((c) => c.slug === active),
  );

  const subcategories: Category[] = openParent?.children ?? [];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        <Chip slug="all" name="All" active={active} />
        {tree.map((parent) => (
          <Chip
            key={parent.slug}
            slug={parent.slug}
            name={parent.name}
            active={active}
          />
        ))}
      </div>

      {subcategories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {subcategories.map((child) => (
            <Chip
              key={child.slug}
              slug={child.slug}
              name={child.name}
              active={active}
              small
            />
          ))}
        </div>
      )}
    </div>
  );
}
