"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function createCategoryAction(name: string, slug: string, sortOrder: number = 0) {
  await requireAdmin();

  const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!name.trim() || !formattedSlug) {
    return { success: false, error: "Name and slug are required" };
  }

  try {
    const existing = await db.category.findUnique({ where: { slug: formattedSlug } });
    if (existing) {
      return { success: false, error: "Category slug already exists" };
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        slug: formattedSlug,
        sortOrder,
      },
    });

    revalidatePath("/products");
    revalidatePath("/admin/categories");
    return { success: true, category };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create category" };
  }
}

export async function updateCategoryAction(id: string, name: string, slug: string, sortOrder: number) {
  await requireAdmin();

  const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!name.trim() || !formattedSlug) {
    return { success: false, error: "Name and slug are required" };
  }

  try {
    const conflict = await db.category.findFirst({
      where: {
        id: { not: id },
        slug: formattedSlug,
      },
    });
    if (conflict) {
      return { success: false, error: "Category slug already exists" };
    }

    const category = await db.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug: formattedSlug,
        sortOrder,
      },
    });

    revalidatePath("/products");
    revalidatePath("/admin/categories");
    return { success: true, category };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin();

  try {
    const productCount = await db.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return {
        success: false,
        error: `Cannot delete category containing ${productCount} products. Move products to another category first.`,
      };
    }

    await db.category.delete({ where: { id } });
    revalidatePath("/products");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete category" };
  }
}
