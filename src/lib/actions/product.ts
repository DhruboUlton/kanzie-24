"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG, PRODUCT_PAGES } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { productSchema } from "@/lib/schemas/product";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-html";
import { collectMediaUrls } from "@/lib/product-media";

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

    await syncProductMediaRelations(product.id, images);

    revalidatePath("/");
    revalidatePath("/products");
    updateTag(CATALOG_TAG);
    revalidatePath(PRODUCT_PAGES, "page");
    revalidatePath("/adpnl/products");

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

    await syncProductMediaRelations(updated.id, images);

    revalidatePath("/");
    revalidatePath("/products");
    updateTag(CATALOG_TAG);
    revalidatePath(PRODUCT_PAGES, "page");
    revalidatePath("/adpnl/products");

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

async function syncProductMediaRelations(productId: string, images: string[]) {
  try {
    await db.productMedia.deleteMany({ where: { productId } });
    if (!images || images.length === 0) return;

    const matchedMedia = await db.media.findMany({
      where: { url: { in: images } },
    });
    const mediaByUrl = new Map(matchedMedia.map((m) => [m.url, m.id]));
    const data: { productId: string; mediaId: string; sortOrder: number; isPrimary: boolean }[] = [];
    const seenMediaIds = new Set<string>();

    for (let i = 0; i < images.length; i++) {
      const mediaId = mediaByUrl.get(images[i]);
      if (mediaId && !seenMediaIds.has(mediaId)) {
        seenMediaIds.add(mediaId);
        data.push({
          productId,
          mediaId,
          sortOrder: i,
          isPrimary: i === 0,
        });
      }
    }

    if (data.length > 0) {
      await db.productMedia.createMany({
        data,
        skipDuplicates: true,
      });
    }
  } catch (err) {
    console.warn("Failed to sync ProductMedia relations:", err);
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
    updateTag(CATALOG_TAG);
    revalidatePath(PRODUCT_PAGES, "page");
    revalidatePath("/adpnl/products");

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
    updateTag(CATALOG_TAG);
    revalidatePath(PRODUCT_PAGES, "page");
    revalidatePath("/adpnl/products");

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
 * How many orders a product appears on, so the admin can be told before
 * deleting it rather than after.
 */
export async function getProductDeletionImpact(id: string): Promise<{
  success: boolean;
  error?: string;
  name?: string;
  orderCount?: number;
  soldQty?: number;
  mediaCount?: number;
}> {
  try {
    await requirePermission("PRODUCTS_DELETE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    const product = await db.product.findUnique({
      where: { id },
      select: { name: true, images: true, videoUrl: true, popupVideoUrl: true },
    });
    if (!product) return { success: false, error: "Product not found." };

    const items = await db.orderItem.findMany({
      where: { productId: id },
      select: { orderId: true, qty: true },
    });

    return {
      success: true,
      name: product.name,
      orderCount: new Set(items.map((i) => i.orderId)).size,
      soldQty: items.reduce((sum, i) => sum + i.qty, 0),
      mediaCount: collectMediaUrls(product).length,
    };
  } catch {
    return { success: false, error: "Couldn't read the product." };
  }
}

/**
 * Permanently deletes a product, its stock history, and its uploaded media.
 *
 * Order history is never destroyed with it. Each line item already carries
 * its own copy of the name, SKU and price it sold at, and the foreign key
 * nulls the product link rather than removing the line — so the order still
 * totals correctly. What the line loses is any way to explain the gap, which
 * is why it is stamped with who deleted the product and when, in the same
 * transaction as the deletion itself.
 *
 * Media is removed after the transaction commits, not inside it: files are
 * not transactional, and a rolled-back delete that had already unlinked the
 * photos would leave a live product with no images.
 */
export async function deleteProductAction(id: string) {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_DELETE");
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  try {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) return { success: false, error: "Product not found." };

    const deletedAt = new Date();

    const soldItems = await db.$transaction(async (tx) => {
      const stamped = await tx.orderItem.updateMany({
        where: { productId: id },
        data: { productDeletedAt: deletedAt, productDeletedBy: ctx.name },
      });

      // Cascades the stock movements; nulls productId on the stamped lines.
      // Cascades ProductMedia associations without deleting the underlying Media assets.
      await tx.product.delete({ where: { id } });

      return stamped.count;
    });

    revalidatePath("/");
    revalidatePath("/products");
    updateTag(CATALOG_TAG);
    revalidatePath(PRODUCT_PAGES, "page");
    revalidatePath("/adpnl/products");
    revalidatePath("/adpnl/orders");
    revalidatePath("/adpnl/inventory");

    await logActivity({
      actor: ctx,
      action: "PRODUCT_DELETED",
      entityType: "PRODUCT",
      entityId: product.id,
      description: `Deleted ${product.name} (media library assets preserved)`,
      metadata: {
        sku: product.sku,
        slug: product.slug,
        orderLinesStamped: soldItems,
      },
    });

    return { success: true, orderLines: soldItems };
  } catch (error) {
    console.error("Product delete failed", error);
    return { success: false, error: "Couldn't delete that product." };
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

    revalidatePath("/adpnl/products");
    revalidatePath("/products");
    updateTag(CATALOG_TAG);
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

    revalidatePath("/adpnl/products");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Reorder featured products error:", error);
    return { success: false, error: "Couldn't save that order." };
  }
}
