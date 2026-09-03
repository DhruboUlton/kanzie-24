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
    compareAtPriceTaka,
    scale,
    shortDescription,
    description,
    features,
    specs,
    images,
    featured,
    isNew,
    inStock,
    stockQty,
    videoUrl,
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
    const compareAtPriceCents = compareAtPriceTaka
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
        compareAtPriceCents,
        scale,
        shortDescription,
        description: cleanDescription,
        features: features,
        specs: specs,
        images: images,
        featured,
        isNew,
        inStock,
        stockQty,
        videoUrl: videoUrl || null,
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
    compareAtPriceTaka,
    scale,
    shortDescription,
    description,
    features,
    specs,
    images,
    featured,
    isNew,
    inStock,
    stockQty,
    videoUrl,
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
    const compareAtPriceCents = compareAtPriceTaka
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
        compareAtPriceCents,
        scale,
        shortDescription,
        description: cleanDescription,
        features,
        specs,
        images,
        featured,
        isNew,
        inStock,
        stockQty,
        videoUrl: videoUrl || null,
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
