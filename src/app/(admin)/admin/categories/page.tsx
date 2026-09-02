import { db } from "@/lib/db";
import { getCategories } from "@/lib/products";
import CategoryManagerClient from "@/components/admin/CategoryManagerClient";
import { requirePageAccess } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const { allowed } = await requirePageAccess("CATEGORIES_VIEW");
  if (!allowed) return <NoAccess what="categories" />;

  let categories: any[] = [];
  try {
    categories = await db.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    categories = await getCategories();
  }

  return <CategoryManagerClient categories={categories} />;
}
