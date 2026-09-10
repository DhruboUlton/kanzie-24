import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import {
  getCachedCategories,
  getCachedCategoryTree,
  getCachedProductsByCategory,
} from "@/lib/products";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { SITE_NAME, SITE_TAGLINE, absoluteUrl } from "@/lib/site-config";
import type { Metadata } from "next";

export async function generateMetadata(
  props: PageProps<"/products">,
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const slug = typeof searchParams.category === "string" ? searchParams.category : "all";

  if (slug === "all") {
    return {
      title: `Shop all RC machines | ${SITE_NAME}`,
      description: SITE_TAGLINE,
      alternates: { canonical: "/products" },
    };
  }

  const category = (await getCachedCategories()).find((c) => c.slug === slug);
  if (!category) {
    return { title: `Shop all RC machines | ${SITE_NAME}`, alternates: { canonical: "/products" } };
  }

  return {
    title: `${category.name} — remote control ${category.name.toLowerCase()} | ${SITE_NAME}`,
    description: `Browse ${category.name.toLowerCase()} at ${SITE_NAME}. ${SITE_TAGLINE}`,
    // The filtered view is its own landing page, so it points at itself
    // rather than collapsing every category into /products.
    alternates: { canonical: `/products?category=${category.slug}` },
  };
}

export default async function ProductsPage(props: PageProps<"/products">) {
  const searchParams = await props.searchParams;
  const categoryParam = searchParams.category;
  const requested = typeof categoryParam === "string" ? categoryParam : "all";

  const [tree, categories] = await Promise.all([
    getCachedCategoryTree(),
    getCachedCategories(),
  ]);

  // An unrecognised ?category= is shown as "all" rather than looked up. The
  // slug reaches both a database query and a cache key, and both are
  // budgeted: otherwise any string a stranger invents mints its own cache
  // entry and spends a connection proving the category doesn't exist.
  const active =
    requested === "all" || categories.some((c) => c.slug === requested)
      ? requested
      : "all";

  const products = await getCachedProductsByCategory(active);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([{ name: "Shop", path: "/products" }]),
          {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.map((product, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(`/products/${product.slug}`),
              name: product.name,
            })),
          },
        )}
      />

      <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-center mb-8">
        SHOP ALL MACHINES
      </h1>

      <div className="flex justify-center mb-10">
        <CategoryFilter tree={tree} active={active} />
      </div>

      {products.length === 0 ? (
        <p className="text-center text-black/60 py-20">
          No products in this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      )}
    </div>
  );
}
