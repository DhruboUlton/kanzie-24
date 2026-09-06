import { getCategories } from "@/lib/products";
import ProductForm from "@/components/admin/ProductForm";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { allowed } = await requirePageAccess("PRODUCTS_CREATE");
  if (!allowed) return <NoAccess what="adding products" />;

  const categories = await getCategories();

  return (
    <div>
      <ProductForm categories={categories} />
    </div>
  );
}
