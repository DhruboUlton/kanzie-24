"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/cache-tags";
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
  imageUrl: string | null = null,
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
        imageUrl: imageUrl?.trim() || null,
      },
    });

    revalidatePath("/products");
    updateTag(CATALOG_TAG);
    revalidatePath("/adpnl/categories");
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
  imageUrl: string | null = null,
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
        // Empty clears it, which sends the tile back to a product photo.
        imageUrl: imageUrl?.trim() || null,
      },
    });

    revalidatePath("/products");
    updateTag(CATALOG_TAG);
    revalidatePath("/adpnl/categories");
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
    updateTag(CATALOG_TAG);
    revalidatePath("/adpnl/categories");
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


/**
 * Sets the order of one group at a time — either the top-level categories,
 * or the subcategories under one parent. The whole group is sent on every
 * move, so two saves racing each other still end with the list the admin
 * last saw rather than a half-applied shuffle.
 *
 * Positions are rewritten as 0,1,2… rather than nudged, so a list that had
 * drifted (everything created at sortOrder 0, which is the default) comes
 * out consecutive on the first drag.
 */
export async function reorderCategoriesAction(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("CATEGORIES_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const ids = Array.isArray(orderedIds)
    ? orderedIds.filter((id): id is string => typeof id === "string" && !!id)
    : [];
  if (ids.length === 0) return { success: false, error: "Nothing to reorder." };
  if (new Set(ids).size !== ids.length) {
    return { success: false, error: "That list has a category in it twice." };
  }

  try {
    const found = await db.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, parentId: true },
    });
    if (found.length !== ids.length) {
      return { success: false, error: "One of those categories no longer exists." };
    }

    // Every id must sit at the same level, so a drag can never quietly
    // re-parent something. Moving a category between levels is the edit
    // form's job.
    const levels = new Set(found.map((c) => c.parentId ?? "__root__"));
    if (levels.size > 1) {
      return { success: false, error: "Categories can only be reordered within one level." };
    }

    await db.$transaction(
      ids.map((id, index) =>
        db.category.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    const byId = new Map(found.map((c) => [c.id, c.name]));

    await logActivity({
      actor: ctx,
      action: "CATEGORY_UPDATED",
      entityType: "CATEGORY",
      description: "Reordered categories",
      metadata: { order: ids.map((id) => byId.get(id) ?? id) },
    });

    revalidatePath("/products");
    updateTag(CATALOG_TAG);
    revalidatePath("/adpnl/categories");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    const denied = authErrorResult(error);
    if (denied) return denied;
    console.error("reorderCategories error:", error);
    return { success: false, error: "Couldn't save the new order." };
  }
}

/**
 * Shows or hides this category's row of products on the homepage.
 *
 * Its own action rather than another argument on updateCategoryAction,
 * because this is flipped from the list while looking at every category at
 * once — deciding which get a rail is a comparison between categories, not
 * an edit to one of them.
 *
 * Narrow on purpose: the "Shop by machine" strip, the nav, the shop filter
 * and the category's own page are all untouched. This removes a preview row
 * from the front page, nothing more.
 */
export async function setCategoryHomepageAction(
  id: string,
  showOnHomepage: boolean,
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("CATEGORIES_MANAGE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    const category = await db.category.update({
      where: { id },
      data: { showOnHomepage },
    });

    revalidatePath("/", "layout");
    revalidatePath("/adpnl/categories");

    await logActivity({
      actor: ctx,
      action: "CATEGORY_UPDATED",
      entityType: "CATEGORY",
      entityId: category.id,
      description: `${showOnHomepage ? "Showed" : "Hid"} the ${category.name} row on the homepage`,
      metadata: { slug: category.slug, showOnHomepage },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Couldn't change that." };
  }
}
