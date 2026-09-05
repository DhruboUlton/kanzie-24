import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getCategories, getFeaturedProducts, getProductsByCategory } from "@/lib/products";
import ProductArrangeClient, {
  ArrangeRow,
  ArrangeScope,
} from "@/components/admin/ProductArrangeClient";

export const dynamic = "force-dynamic";

export default async function ArrangeProductsPage(props: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { allowed } = await requirePageAccess("PRODUCTS_EDIT");
  if (!allowed) return <NoAccess what="arranging products" />;

  const { scope } = await props.searchParams;
  const categories = await getCategories();

  // Only leaf categories hold products; a parent is a grouping label, so
  // arranging one would be arranging a list nothing reads.
  const leaves = categories.filter(
    (c) => c.id && !categories.some((other) => other.parentId === c.id),
  );

  const [featured, ...perCategory] = await Promise.all([
    getFeaturedProducts(),
    ...leaves.map((c) => getProductsByCategory(c.slug)),
  ]);

  const scopes: ArrangeScope[] = [
    { key: "featured", label: "Featured products (homepage)", count: featured.length },
    ...leaves.map((c, i) => ({
      key: c.slug,
      label: c.name,
      count: perCategory[i]?.length ?? 0,
    })),
  ];

  const activeScope =
    scope && scopes.some((s) => s.key === scope) ? scope : scopes[0]?.key ?? "featured";

  const selected =
    activeScope === "featured"
      ? featured
      : perCategory[leaves.findIndex((c) => c.slug === activeScope)] ?? [];

  const products: ArrangeRow[] = selected.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    image: p.images[0] ?? "/kanzie-icon.png",
    priceCents: p.priceCents,
    salePercent: p.salePercent,
    compareAtPriceCents: p.compareAtPriceCents,
    soldOut: p.soldOut,
    stockQty: p.stockQty,
    inStock: p.inStock,
  }));

  return (
    <ProductArrangeClient
      products={products}
      scopes={scopes}
      activeScope={activeScope}
    />
  );
}
