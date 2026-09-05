"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { productSchema } from "@/lib/schemas/product";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-html";

export async function createProductAction(data: any) {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_CREATE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const validated = productSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues.map((i) => i.message).join(", "),
    };
  }

  const {
    name,
    slug,
    brand,
    sku,
    categoryId,
    priceTaka,
    salePercent,
    compareAtPriceTaka,
    scale,
    shortDescription,
    description,
    features,
    specs,
    images,
    featured,
    featuredOrder,
    categoryOrder,
    soldOut,
    isNew,
    inStock,
    stockQty,
    videoUrl,
    popupVideoUrl,
  } = validated.data;

  const cleanDescription = sanitizeDescriptionHtml(description);

  try {
    // Check if slug or SKU exists
    const existing = await db.product.findFirst({
      where: {
        OR: [{ slug }, { sku }],
      },
    });

    if (existing) {
      if (existing.slug === slug) {
        return { success: false, error: "A product with this slug already exists" };
      }
      if (existing.sku === sku) {
        return { success: false, error: "A product with this SKU already exists" };
      }
    }

    const priceCents = Math.round(priceTaka * 100);
    // A percentage sale already carries the original price in priceCents, so
    // a compare-at kept alongside it would be a second, contradictory answer
    // to "what did this cost before?". Clear it rather than store both.
    const compareAtPriceCents = salePercent
      ? null
      : compareAtPriceTaka
      ? Math.round(compareAtPriceTaka * 100)
      : null;

    const product = await db.product.create({
      data: {
        name,
        slug,
        brand,
        sku,
        categoryId,
        priceCents,
        salePercent: salePercent ?? null,
        compareAtPriceCents,
        scale,
        shortDescription,
        description: cleanDescription,
        features: features,
        specs: specs,
        images: images,
        featured,
        featuredOrder,
        categoryOrder,
        soldOut,
        isNew,
        inStock,
        stockQty,
        videoUrl: videoUrl || null,
        popupVideoUrl: popupVideoUrl || null,
      },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);
    revalidatePath("/admin/products");

    await logActivity({
      actor: ctx,
      action: "PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: product.id,
      description: `Created ${product.name}`,
      metadata: { sku: product.sku, slug: product.slug },
    });

    return { success: true, product };
  } catch (error: any) {
    console.error("createProduct error:", error);
    return { success: false, error: error.message || "Failed to create product" };
  }
}

export async function updateProductAction(id: string, data: any) {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_EDIT");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const validated = productSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues.map((i) => i.message).join(", "),
    };
  }

  const {
    name,
    slug,
    brand,
    sku,
    categoryId,
    priceTaka,
    salePercent,
    compareAtPriceTaka,
    scale,
    shortDescription,
    description,
    features,
    specs,
    images,
    featured,
    featuredOrder,
    categoryOrder,
    soldOut,
    isNew,
    inStock,
    stockQty,
    videoUrl,
    popupVideoUrl,
  } = validated.data;

  const cleanDescription = sanitizeDescriptionHtml(description);

  try {
    // Check conflicts
    const conflict = await db.product.findFirst({
      where: {
        id: { not: id },
        OR: [{ slug }, { sku }],
      },
    });

    if (conflict) {
      if (conflict.slug === slug) {
        return { success: false, error: "Another product with this slug already exists" };
      }
      if (conflict.sku === sku) {
        return { success: false, error: "Another product with this SKU already exists" };
      }
    }

    const priceCents = Math.round(priceTaka * 100);
    // A percentage sale already carries the original price in priceCents, so
    // a compare-at kept alongside it would be a second, contradictory answer
    // to "what did this cost before?". Clear it rather than store both.
    const compareAtPriceCents = salePercent
      ? null
      : compareAtPriceTaka
      ? Math.round(compareAtPriceTaka * 100)
      : null;

    const updated = await db.product.update({
      where: { id },
      data: {
        name,
        slug,
        brand,
        sku,
        categoryId,
        priceCents,
        salePercent: salePercent ?? null,
        compareAtPriceCents,
        scale,
        shortDescription,
        description: cleanDescription,
        features,
        specs,
        images,
        featured,
        featuredOrder,
        categoryOrder,
        soldOut,
        isNew,
        inStock,
        stockQty,
        videoUrl: videoUrl || null,
        popupVideoUrl: popupVideoUrl || null,
      },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);
    revalidatePath("/admin/products");

    await logActivity({
      actor: ctx,
      action: "PRODUCT_UPDATED",
      entityType: "PRODUCT",
      entityId: updated.id,
      description: `Updated ${updated.name}`,
      metadata: { sku: updated.sku, slug: updated.slug },
    });

    return { success: true, product: updated };
  } catch (error: any) {
    console.error("updateProduct error:", error);
    return { success: false, error: error.message || "Failed to update product" };
  }
}

export async function archiveProductAction(id: string) {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_ARCHIVE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }
  try {
    const product = await db.product.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");

    await logActivity({
      actor: ctx,
      action: "PRODUCT_ARCHIVED",
      entityType: "PRODUCT",
      entityId: product.id,
      description: `Archived ${product.name}`,
      metadata: { sku: product.sku },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to archive product" };
  }
}

export async function restoreProductAction(id: string) {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_ARCHIVE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }
  try {
    const product = await db.product.update({
      where: { id },
      data: { archivedAt: null },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");

    await logActivity({
      actor: ctx,
      action: "PRODUCT_RESTORED",
      entityType: "PRODUCT",
      entityId: product.id,
      description: `Restored ${product.name}`,
      metadata: { sku: product.sku },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore product" };
  }
}

/**
 * Sets the order of the products inside one category.
 *
 * Mirrors reorderCategoriesAction: the whole list is sent on every move, so
 * two saves racing each other still end with the arrangement the admin last
 * saw rather than a half-applied shuffle. Positions are rewritten as 0,1,2…
 * rather than nudged, so a category where every product still sits at the
 * default 0 comes out consecutive after the first drag.
 */
export async function reorderCategoryProductsAction(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_EDIT");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const ids = Array.isArray(orderedIds)
    ? orderedIds.filter((id): id is string => typeof id === "string" && !!id)
    : [];
  if (ids.length === 0) return { success: false, error: "Nothing to reorder." };
  if (new Set(ids).size !== ids.length) {
    return { success: false, error: "That list has a product in it twice." };
  }

  try {
    const found = await db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, categoryId: true, category: { select: { slug: true } } },
    });
    if (found.length !== ids.length) {
      return { success: false, error: "One of those products no longer exists." };
    }

    // Every id must belong to the same category, so a drag can never quietly
    // move a product out of the one being arranged.
    const categories = new Set(found.map((p) => p.categoryId));
    if (categories.size > 1) {
      return {
        success: false,
        error: "Products can only be reordered within one category.",
      };
    }

    await db.$transaction(
      ids.map((id, index) =>
        db.product.update({ where: { id }, data: { categoryOrder: index } }),
      ),
    );

    await logActivity({
      actor: ctx,
      action: "PRODUCT_UPDATED",
      entityType: "PRODUCT",
      description: `Reordered ${ids.length} products in a category`,
      metadata: { count: ids.length, categoryId: found[0]?.categoryId },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    const slug = found[0]?.category?.slug;
    if (slug) revalidatePath(`/products?category=${slug}`);
    return { success: true };
  } catch (error) {
    console.error("Reorder category products error:", error);
    return { success: false, error: "Couldn't save that order." };
  }
}

/**
 * Sets the order of the featured rail. A separate axis from the category
 * order above — the same product can lead here and sit far down its category.
 */
export async function reorderFeaturedProductsAction(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_EDIT");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const ids = Array.isArray(orderedIds)
    ? orderedIds.filter((id): id is string => typeof id === "string" && !!id)
    : [];
  if (ids.length === 0) return { success: false, error: "Nothing to reorder." };
  if (new Set(ids).size !== ids.length) {
    return { success: false, error: "That list has a product in it twice." };
  }

  try {
    const found = await db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, featured: true },
    });
    if (found.length !== ids.length) {
      return { success: false, error: "One of those products no longer exists." };
    }
    if (found.some((p) => !p.featured)) {
      return {
        success: false,
        error: "Only featured products can be given a featured order.",
      };
    }

    await db.$transaction(
      ids.map((id, index) =>
        db.product.update({ where: { id }, data: { featuredOrder: index } }),
      ),
    );

    await logActivity({
      actor: ctx,
      action: "PRODUCT_UPDATED",
      entityType: "PRODUCT",
      description: `Reordered ${ids.length} featured products`,
      metadata: { count: ids.length },
    });

    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Reorder featured products error:", error);
    return { success: false, error: "Couldn't save that order." };
  }
}
