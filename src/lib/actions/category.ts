"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

// Categories nest exactly one level: a parent groups subcategories, and
// products are filed on the leaves. Rejects anything that would create a
// deeper tree or a cycle.
async function validateParent(
  parentId: string | null,
  selfId?: string,
): Promise<string | null> {
  if (!parentId) return null;
  if (selfId && parentId === selfId) return "A category can't be its own parent.";

  const parent = await db.category.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });
  if (!parent) return "Selected parent category no longer exists.";
  if (parent.parentId) {
    return "Subcategories can only go one level deep — pick a top-level category as the parent.";
  }

  if (selfId) {
    const childCount = await db.category.count({ where: { parentId: selfId } });
    if (childCount > 0) {
      return "This category already has subcategories, so it can't become one itself.";
    }
  }

  return null;
}

export async function createCategoryAction(
  name: string,
  slug: string,
  sortOrder: number = 0,
  parentId: string | null = null,
) {
  let ctx;
  try {
    ctx = await requirePermission("CATEGORIES_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const formattedSlug = normalizeSlug(slug);
  if (!name.trim() || !formattedSlug) {
    return { success: false, error: "Name and slug are required" };
  }

  try {
    const existing = await db.category.findUnique({ where: { slug: formattedSlug } });
    if (existing) {
      return { success: false, error: "Category slug already exists" };
    }

    const parentError = await validateParent(parentId);
    if (parentError) return { success: false, error: parentError };

    const category = await db.category.create({
      data: {
        name: name.trim(),
        slug: formattedSlug,
        sortOrder,
        parentId: parentId || null,
      },
    });

    revalidatePath("/products");
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    await logActivity({
      actor: ctx,
      action: "CATEGORY_CREATED",
      entityType: "CATEGORY",
      entityId: category.id,
      description: `Created category ${category.name}`,
      metadata: { slug: category.slug },
    });

    return { success: true, category };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create category" };
  }
}

export async function updateCategoryAction(
  id: string,
  name: string,
  slug: string,
  sortOrder: number,
  parentId: string | null = null,
) {
  let ctx;
  try {
    ctx = await requirePermission("CATEGORIES_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const formattedSlug = normalizeSlug(slug);
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

    const parentError = await validateParent(parentId, id);
    if (parentError) return { success: false, error: parentError };

    const category = await db.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug: formattedSlug,
        sortOrder,
        parentId: parentId || null,
      },
    });

    revalidatePath("/products");
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    await logActivity({
      actor: ctx,
      action: "CATEGORY_UPDATED",
      entityType: "CATEGORY",
      entityId: category.id,
      description: `Updated category ${category.name}`,
      metadata: { slug: category.slug },
    });

    return { success: true, category };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export async function deleteCategoryAction(id: string) {
  let ctx;
  try {
    ctx = await requirePermission("CATEGORIES_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    const productCount = await db.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return {
        success: false,
        error: `Cannot delete category containing ${productCount} products. Move products to another category first.`,
      };
    }

    const childCount = await db.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      return {
        success: false,
        error: `Cannot delete a category with ${childCount} subcategories. Delete or move them first.`,
      };
    }

    await db.category.delete({ where: { id } });
    revalidatePath("/products");
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    await logActivity({
      actor: ctx,
      action: "CATEGORY_DELETED",
      entityType: "CATEGORY",
      entityId: id,
      description: "Deleted a category",
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete category" };
  }
}
