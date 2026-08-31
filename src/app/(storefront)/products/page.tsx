import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import { getCategoryTree, getProductsByCategory } from "@/lib/products";

export default async function ProductsPage(props: PageProps<"/products">) {
  const searchParams = await props.searchParams;
  const categoryParam = searchParams.category;
  const active =
    typeof categoryParam === "string" ? categoryParam : "all";

  const [tree, products] = await Promise.all([
    getCategoryTree(),
    getProductsByCategory(active),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-center mb-8">
        SHOP ALL MACHINES
      </h1>

      <div className="flex justify-center mb-10">
        <CategoryFilter tree={tree} active={active} />
      </div>

      {products.length === 0 ? (
        <p className="text-center text-black/50 py-20">
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
