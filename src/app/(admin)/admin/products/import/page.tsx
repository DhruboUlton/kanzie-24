import { getCategories } from "@/lib/products";
import ProductImport from "@/components/admin/ProductImport";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function ImportProductsPage() {
  const { allowed } = await requirePageAccess("PRODUCTS_CREATE");
  if (!allowed) return <NoAccess what="importing products" />;

  const categories = await getCategories();

  return (
    <ProductImport
      categories={categories
        .filter((category) => Boolean(category.id))
        .map((category) => ({ id: category.id as string, name: category.name }))}
    />
  );
}
