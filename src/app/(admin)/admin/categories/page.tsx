import { db } from "@/lib/db";
import { getCategories } from "@/lib/products";
import CategoryManagerClient from "@/components/admin/CategoryManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
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
